import {
  ArrowFunctionExpression,
  AssignmentExpression,
  BlockStatement,
  BreakStatement,
  CatchClause,
  ContinueStatement,
  ExpressionStatement,
  ForInStatement,
  ForOfStatement,
  ForStatement,
  FunctionDeclaration,
  FunctionExpression,
  IfStatement,
  ReturnStatement,
  SwitchCase,
  SwitchStatement,
  ThrowStatement,
  TryStatement,
  UpdateExpression,
  VariableDeclaration,
} from "@babel/types";
import { CookVisitorState, VisitorCallback, VisitorFn } from "./interfaces";
import { CookVisitor } from "./CookVisitor";
import {
  assertIterable,
  isTerminated,
  spawnCookState,
  spawnCookStateOfBlock,
  lowerLevelSpawnCookStateOfBlock,
} from "./utils";

// Todo:  while

const ForOfStatementItemVisitor = (
  node: ForOfStatement | ForInStatement,
  blockState: CookVisitorState,
  callback: VisitorCallback<CookVisitorState>,
  value: unknown
): void => {
  const leftState = spawnCookState(blockState, {
    assignment: {
      initializing: true,
      rightCooked: value,
    },
  });
  callback(node.left, leftState);

  callback(node.body, blockState);
};

const ForOfStatementVisitor: VisitorFn<CookVisitorState> = (
  node: ForOfStatement | ForInStatement,
  state,
  callback
) => {
  const blockState = spawnCookStateOfBlock(node, state, {
    controlFlow: {},
  });

  const rightState = spawnCookState(blockState);
  callback(node.right, rightState);

  if (node.type === "ForOfStatement") {
    assertIterable(rightState.cooked, state.source, node.start, node.end);
    for (const value of rightState.cooked) {
      ForOfStatementItemVisitor(node, blockState, callback, value);
      blockState.controlFlow.continued = false;
      if (isTerminated(blockState)) {
        break;
      }
    }
  } else {
    for (const value in rightState.cooked) {
      ForOfStatementItemVisitor(node, blockState, callback, value);
      blockState.controlFlow.continued = false;
      if (isTerminated(blockState)) {
        break;
      }
    }
  }
};

const FunctionVisitor: VisitorFn<CookVisitorState> = (
  node: FunctionDeclaration | FunctionExpression | ArrowFunctionExpression,
  state,
  callback
) => {
  if (node.async || node.generator) {
    throw new SyntaxError(
      `${
        node.async ? "Async" : "Generator"
      } function is not allowed, but received: \`${state.source.substring(
        node.start,
        node.end
      )}\``
    );
  }

  if (
    node.type === "FunctionDeclaration" &&
    !(state.hoisting || state.isRoot)
  ) {
    return;
  }

  const fn = function (...args: unknown[]): unknown {
    const { precookScope, blockState } = lowerLevelSpawnCookStateOfBlock(
      node,
      state,
      {
        isFunctionBody: true,
        returns: {
          returned: false,
        },
      }
    );

    if (node.type === "FunctionExpression" && node.id) {
      const topScope = blockState.scopeStack[blockState.scopeStack.length - 1];
      const ref = topScope.variables.get(node.id.name);
      ref.cooked = state.cooked;
      ref.initialized = true;
    }

    node.params.forEach((param, index) => {
      const variableInitValue =
        param.type === "RestElement" ? args.slice(index) : args[index];

      const paramState = spawnCookState(blockState, {
        assignment: {
          initializing: true,
          rightCooked: variableInitValue,
        },
      });

      callback(param, paramState);
    });

    for (const hoistedFn of precookScope.hoistedFunctions) {
      callback(
        hoistedFn,
        spawnCookState(blockState, {
          isFunctionBody: true,
          hoisting: true,
        })
      );
    }

    callback(node.body, blockState);

    return blockState.returns.cooked;
  };

  if (state.isRoot || node.type !== "FunctionDeclaration") {
    state.cooked = fn;
  }

  if (node.type === "FunctionDeclaration") {
    const topScope = state.scopeStack[state.scopeStack.length - 1];
    const ref = topScope.get(node.id.name);
    ref.cooked = fn;
    ref.initialized = true;
  }
};

export const FeastVisitor = Object.freeze<
  Record<string, VisitorFn<CookVisitorState>>
>({
  ...CookVisitor,
  ArrowFunctionExpression: FunctionVisitor,
  AssignmentExpression(node: AssignmentExpression, state, callback) {
    const rightState = spawnCookState(state);
    callback(node.right, rightState);

    const leftState = spawnCookState(state, {
      assignment: {
        operator: node.operator,
        rightCooked: rightState.cooked,
      },
    });
    callback(node.left, leftState);

    state.cooked = leftState.cooked;
  },
  BlockStatement(node: BlockStatement, state, callback) {
    const { precookScope, blockState } = lowerLevelSpawnCookStateOfBlock(
      node,
      state
    );

    if (precookScope) {
      for (const hoistedFn of precookScope.hoistedFunctions) {
        callback(
          hoistedFn,
          spawnCookState(blockState, {
            hoisting: true,
          })
        );
      }
    }

    for (const statement of node.body) {
      callback(statement, blockState);
      if (isTerminated(blockState)) {
        break;
      }
    }
  },
  BreakStatement(node: BreakStatement, state) {
    // istanbul ignore if
    if (node.label) {
      throw new SyntaxError(
        `Labeled break statement is not allowed, but received \`${state.source.substring(
          node.start,
          node.end
        )}\``
      );
    }
    state.controlFlow.broken = true;
  },
  CatchClause(node: CatchClause, state, callback) {
    const blockState = spawnCookStateOfBlock(node, state);

    const paramState = spawnCookState(blockState, {
      assignment: {
        initializing: true,
        rightCooked: state.caughtError,
      },
    });
    callback(node.param, paramState);
    callback(node.body, spawnCookState(blockState));
  },
  ContinueStatement(node: ContinueStatement, state) {
    // istanbul ignore if
    if (node.label) {
      throw new SyntaxError(
        `Labeled continue statement is not allowed, but received \`${state.source.substring(
          node.start,
          node.end
        )}\``
      );
    }
    state.controlFlow.continued = true;
  },
  EmptyStatement() {
    // Do nothing.
  },
  ExpressionStatement(node: ExpressionStatement, state, callback) {
    callback(node.expression, spawnCookState(state));
  },
  ForInStatement: ForOfStatementVisitor,
  ForOfStatement: ForOfStatementVisitor,
  ForStatement(node: ForStatement, state, callback) {
    const blockState = spawnCookStateOfBlock(node, state, {
      controlFlow: {},
    });

    const init = (): void => {
      if (node.init) {
        callback(node.init, spawnCookState(blockState));
      }
    };
    const test = (): boolean => {
      if (node.test) {
        const testState = spawnCookState(blockState);
        callback(node.test, testState);
        return testState.cooked;
      }
      return true;
    };
    const update = (): void => {
      if (node.update) {
        callback(node.update, spawnCookState(blockState));
      }
    };
    for (init(); test(); update()) {
      callback(node.body, spawnCookState(blockState));
      blockState.controlFlow.continued = false;
      if (isTerminated(blockState)) {
        break;
      }
    }
  },
  FunctionDeclaration: FunctionVisitor,
  FunctionExpression: FunctionVisitor,
  IfStatement(node: IfStatement, state, callback) {
    const testState = spawnCookState(state);
    callback(node.test, testState);
    if (testState.cooked) {
      callback(node.consequent, spawnCookState(state));
    } else if (node.alternate) {
      callback(node.alternate, spawnCookState(state));
    }
  },
  ReturnStatement(node: ReturnStatement, state, callback) {
    const argumentState = spawnCookState(state);
    if (node.argument) {
      callback(node.argument, argumentState);
    }
    state.returns.returned = true;
    state.returns.cooked = argumentState.cooked;
  },
  SwitchCase(node: SwitchCase, state, callback) {
    if (!state.controlFlow.switchTested && node.test) {
      const testState = spawnCookState(state);
      callback(node.test, testState);
      state.controlFlow.switchTested =
        testState.cooked === state.controlFlow.switchDiscriminantCooked;
    }
    if (state.controlFlow.switchTested || !node.test) {
      for (const statement of node.consequent) {
        callback(statement, state);
        if (isTerminated(state)) {
          state.controlFlow.switchTested = false;
          break;
        }
      }
    }
  },
  SwitchStatement(node: SwitchStatement, state, callback) {
    const discriminantState = spawnCookState(state);
    callback(node.discriminant, discriminantState);

    const { precookScope, blockState } = lowerLevelSpawnCookStateOfBlock(
      node,
      state,
      {
        controlFlow: {
          switchDiscriminantCooked: discriminantState.cooked,
        },
      }
    );

    for (const hoistedFn of precookScope.hoistedFunctions) {
      callback(
        hoistedFn,
        spawnCookState(blockState, {
          hoisting: true,
        })
      );
    }

    for (const switchCase of node.cases) {
      callback(switchCase, blockState);
      if (isTerminated(blockState)) {
        break;
      }
    }
  },
  ThrowStatement(node: ThrowStatement, state, callback) {
    const throwState = spawnCookState(state);
    callback(node.argument, throwState);
    throw throwState.cooked;
  },
  TryStatement(node: TryStatement, state, callback) {
    try {
      callback(node.block, spawnCookState(state));
    } catch (error) {
      if (node.handler) {
        callback(
          node.handler,
          spawnCookState(state, {
            caughtError: error,
          })
        );
      } else {
        throw error;
      }
    } finally {
      if (node.finalizer) {
        callback(node.finalizer, spawnCookState(state));
      }
    }
  },
  UpdateExpression(node: UpdateExpression, state, callback) {
    const argumentState = spawnCookState(state, {
      update: {
        operator: node.operator,
        prefix: node.prefix,
      },
    });
    callback(node.argument, argumentState);
    state.cooked = argumentState.cooked;
  },
  VariableDeclaration(node: VariableDeclaration, state, callback) {
    for (const declaration of node.declarations) {
      let initCooked;
      let hasInit = false;
      if (state.assignment) {
        initCooked = state.assignment.rightCooked;
        hasInit = true;
      } else if (declaration.init) {
        const initState = spawnCookState(state);
        callback(declaration.init, initState);
        initCooked = initState.cooked;
        hasInit = true;
      }
      if (node.kind !== "var" || hasInit) {
        const idState = spawnCookState(state, {
          assignment: {
            initializing: true,
            rightCooked: initCooked,
          },
        });
        callback(declaration.id, idState);
      }
    }
  },
});
