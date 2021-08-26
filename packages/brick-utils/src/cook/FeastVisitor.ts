import { AssignmentExpression, BlockStatement, BreakStatement, ExpressionStatement, FunctionDeclaration, IfStatement, ReturnStatement, SwitchCase, SwitchStatement, VariableDeclaration } from "@babel/types";
import { CookVisitorState, VisitorFn } from "./interfaces";
import { CookVisitor } from "./CookVisitor";
import { spawnCookState } from "./utils";
import { CookScopeStackFactory } from "./Scope";

export const FeastVisitor = Object.freeze<
  Record<string, VisitorFn<CookVisitorState>>
>({
  ...CookVisitor,
  AssignmentExpression(node: AssignmentExpression, state, callback) {
    const rightState = spawnCookState(state);
    callback(node.right, rightState);

    const leftState = spawnCookState(state, {
      assignment: {
        operator: node.operator,
        rightCooked: rightState.cooked,
      }
    });
    callback(node.left, leftState);

    state.cooked = rightState.cooked;
  },
  BlockStatement(node: BlockStatement, state, callback) {
    const scopeStack = CookScopeStackFactory(state.scopeStack, state.scopeMapByNode.get(node));
    const bodyState = spawnCookState(state, {
      scopeStack,
      returns: state.returns,
      switches: state.switches,
    })
    for (const statement of node.body) {
      callback(statement, bodyState);
      if (bodyState.returns.returned) {
        break;
      }
    }
  },
  BreakStatement(node: BreakStatement, state) {
    state.switches.terminated = true;
  },
  EmptyStatement() {
    // Do nothing.
  },
  ExpressionStatement(node: ExpressionStatement, state, callback) {
    callback(node.expression, spawnCookState(state));
  },
  FunctionDeclaration(node: FunctionDeclaration, state, callback) {
    if (node.async || node.generator) {
      throw new SyntaxError(
        `${node.async ? "Async" : "Generator"} function is not allowed, but received: \`${state.source.substring(
          node.start,
          node.end
        )}\``
      );
    }

    // const cookedParamNames: string[] = [];

    state.cooked = function (...args: unknown[]) {
      const scopeStack = CookScopeStackFactory(state.scopeStack, state.scopeMapByNode.get(node));
      const bodyState: CookVisitorState = spawnCookState(state, {
        scopeStack,
        isFunctionBody: true,
        returns: {
          returned: false,
        },
      });
      // const currentScope: CookScope = new Map();
      // const bodyState: CookVisitorState = {
      //   currentScope,
      //   closures: getScopes(state),
      //   source: state.source,
      //   isFunctionBody: true,
      //   returns: {
      //     returned: false,
      //   },
      // };

      // For function parameters, define the current scope first.
      /* for (const paramName of cookedParamNames) {
        currentScope.set(paramName, {
          initialized: false,
        });
      } */

      node.params.forEach((param, index) => {
        const variableInitValue =
          param.type === "RestElement" ? args.slice(index) : args[index];

        const paramState = spawnCookState(bodyState, {
          assignment: {
            initializeOnly: true,
            rightCooked: variableInitValue,
          }
        });

        callback(param, paramState);
      });

      callback(node.body, bodyState);

      return bodyState.returns.cooked;
    };

    /* state.currentScope.set(
      node.id.name, {
        initialized: true,
        cooked: state.cooked,
      }
    );

    const paramNameState: CookVisitorState<string> = spawnCookState(state, {
      collectVariableNamesAsKind: cookedParamNames,
    });
    for (const param of node.params) {
      callback(param, paramNameState);
    } */
  },
  IfStatement(node: IfStatement, state, callback) {
    const testState = spawnCookState(state);
    callback(node.test, testState);
    if (testState.cooked) {
      const consequentState = spawnCookState(state, {
        returns: state.returns
      });
      callback(node.consequent, consequentState);
    } else if (node.alternate) {
      const alternateState = spawnCookState(state, {
        returns: state.returns
      });
      callback(node.alternate, alternateState);
    }
  },
  ReturnStatement(node: ReturnStatement, state, callback) {
    const argumentState = spawnCookState(state);
    if (node.argument) {
      callback(node.argument, argumentState);
    }
    state.returns.returned = true;
    state.returns.cooked = argumentState.cooked;
    if (state.switches) {
      state.switches.terminated = true;
    }
  },
  SwitchCase(node: SwitchCase, state, callback) {
    if (!state.switches.tested && node.test) {
      const testState = spawnCookState(state);
      callback(node.test, testState);
      state.switches.tested = testState.cooked === state.switches.discriminantCooked;
    }
    if (state.switches.tested || !node.test) {
      for (const statement of node.consequent) {
        callback(statement, state);
        if (state.switches.terminated) {
          state.switches.tested = false;
          break;
        }
      }
    }
  },
  SwitchStatement(node: SwitchStatement, state, callback) {
    let switchState = state;
    const discriminantState = spawnCookState(state);
    callback(node.discriminant, discriminantState);
    const scopeStack = CookScopeStackFactory(state.scopeStack, state.scopeMapByNode.get(node));
    switchState = spawnCookState(state, {
      scopeStack,
      returns: state.returns,
      switches: {
        discriminantCooked: discriminantState.cooked,
        tested: false,
        terminated: false,
      },
    });

    for (const switchCase of node.cases) {
      callback(switchCase, switchState);
      if (switchState.switches.terminated) {
        break;
      }
    }
  },
  VariableDeclaration(node: VariableDeclaration, state, callback) {
    /* // Todo(steve): collect scope variables (and functions) across the current scope.
    const declarationNames: string[] = [];
    const declarationNameState = spawnCookState(state, {
      collectVariableNamesAsKind: declarationNames,
    });
    for (const declaration of node.declarations) {
      callback(declaration.id, declarationNameState);
    }
    for (const name of declarationNames) {
      state.currentScope.set(name, {
        initialized: false,
        const: node.kind === "const",
      });
    } */
    for (const declaration of node.declarations) {
      let initCooked;
      if (declaration.init) {
        const initState = spawnCookState(state);
        callback(declaration.init, initState);
        initCooked = initState.cooked;
      }
      const idState = spawnCookState(state, {
        assignment: {
          initializeOnly: true,
          rightCooked: initCooked,
        }
      });
      callback(declaration.id, idState);
    }
  },
});
