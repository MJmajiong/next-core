import {
  ArrayExpression,
  ArrayPattern,
  ArrowFunctionExpression,
  AssignmentPattern,
  BinaryExpression,
  CallExpression,
  ConditionalExpression,
  Identifier,
  LogicalExpression,
  MemberExpression,
  NewExpression,
  ObjectExpression,
  ObjectPattern,
  ObjectProperty,
  RestElement,
  SequenceExpression,
  SpreadElement,
  TaggedTemplateExpression,
  TemplateLiteral,
  UnaryExpression,
} from "@babel/types";
import {
  VisitorFn,
  CookVisitorState,
  PropertyEntryCooked,
  ObjectCooked,
  PropertyCooked,
  ChainExpression,
} from "./interfaces";
import { CookScopeStackFactory } from "./Scope";
import { assertIterable, spawnCookState } from "./utils";

const SupportedConstructorSet = new Set([
  "Array",
  "Date",
  "Map",
  "Set",
  "URLSearchParams",
  "WeakMap",
  "WeakSet",
]);

export const CookVisitor = Object.freeze<
  Record<string, VisitorFn<CookVisitorState>>
>({
  ArrayExpression(
    node: ArrayExpression,
    state: CookVisitorState<unknown[]>,
    callback
  ) {
    const cookedElements: unknown[] = [];
    let index = 0;
    for (const element of node.elements) {
      if (element !== null) {
        const elementState = spawnCookState(state) as CookVisitorState<
          unknown[]
        >;
        callback(element, elementState);
        if (element.type === "SpreadElement") {
          for (let i = 0; i < elementState.cooked.length; i++) {
            cookedElements[index + i] = elementState.cooked[i];
          }
          index += elementState.cooked.length;
        } else {
          cookedElements[index] = elementState.cooked;
          index += 1;
        }
      } else {
        index += 1;
      }
    }
    state.cooked = cookedElements;
  },
  ArrayPattern(node: ArrayPattern, state, callback) {
    if (state.assignment) {
      assertIterable(
        state.assignment.rightCooked,
        state.source,
        node.start,
        node.end
      );
      const [...spreadArgs] = state.assignment.rightCooked as unknown[];
      node.elements.forEach((element, index) => {
        callback(
          element,
          spawnCookState(state, {
            assignment: {
              ...state.assignment,
              rightCooked:
                element.type === "RestElement"
                  ? spreadArgs.slice(index)
                  : spreadArgs[index],
            },
          })
        );
      });
      return;
    }
    // Should nerve reach here.
  },
  ArrowFunctionExpression(
    node: ArrowFunctionExpression,
    state: CookVisitorState<(...args: any[]) => any>,
    callback
  ) {
    if (!node.expression) {
      throw new SyntaxError(
        `Only an \`Expression\` is allowed in \`ArrowFunctionExpression\`'s body, but received: \`${state.source.substring(
          node.start,
          node.end
        )}\``
      );
    }

    if (node.async) {
      throw new SyntaxError(
        `Async function is not allowed, but received: \`${state.source.substring(
          node.start,
          node.end
        )}\``
      );
    }

    state.cooked = function (...args: unknown[]) {
      const scopeStack = CookScopeStackFactory(
        state.scopeStack,
        state.scopeMapByNode.get(node)
      );
      const bodyState: CookVisitorState = spawnCookState(state, {
        scopeStack,
      });

      node.params.forEach((param, index) => {
        const variableInitValue =
          param.type === "RestElement" ? args.slice(index) : args[index];

        const paramState = spawnCookState(bodyState, {
          assignment: {
            initializeOnly: true,
            rightCooked: variableInitValue,
          },
        });

        callback(param, paramState);
      });

      callback(node.body, bodyState);
      return bodyState.cooked;
    };
  },
  AssignmentPattern(node: AssignmentPattern, state, callback) {
    if (state.assignment) {
      if (state.assignment.rightCooked === undefined) {
        const paramValueState = spawnCookState(state);
        callback(node.right, paramValueState);
        callback(
          node.left,
          spawnCookState(state, {
            assignment: {
              ...state.assignment,
              rightCooked: paramValueState.cooked,
            },
          })
        );
      } else {
        callback(node.left, state);
      }
      return;
    }

    /* // istanbul ignore else
    if (state.collectVariableNamesAsKind) {
      callback(node.left, state);
    } */
    // Should nerve reach here.
  },
  BinaryExpression(node: BinaryExpression, state, callback) {
    const leftState = spawnCookState(state);
    callback(node.left, leftState);
    const leftCooked = leftState.cooked;

    const rightState = spawnCookState(state);
    callback(node.right, rightState);
    const rightCooked = rightState.cooked;

    switch (node.operator as BinaryExpression["operator"] | "|>") {
      case "+":
        state.cooked = leftCooked + rightCooked;
        return;
      case "-":
        state.cooked = leftCooked - rightCooked;
        return;
      case "/":
        state.cooked = leftCooked / rightCooked;
        return;
      case "%":
        state.cooked = leftCooked % rightCooked;
        return;
      case "*":
        state.cooked = leftCooked * rightCooked;
        return;
      case "==":
        state.cooked = leftCooked == rightCooked;
        return;
      case "===":
        state.cooked = leftCooked === rightCooked;
        return;
      case "!=":
        state.cooked = leftCooked != rightCooked;
        return;
      case "!==":
        state.cooked = leftCooked !== rightCooked;
        return;
      case ">":
        state.cooked = leftCooked > rightCooked;
        return;
      case "<":
        state.cooked = leftCooked < rightCooked;
        return;
      case ">=":
        state.cooked = leftCooked >= rightCooked;
        return;
      case "<=":
        state.cooked = leftCooked <= rightCooked;
        return;
      case "|>":
        if (typeof rightCooked !== "function") {
          throw new TypeError(
            `${state.source.substring(
              node.right.start,
              node.right.end
            )} is not a function`
          );
        }
        state.cooked = rightCooked(leftCooked);
        return;
    }

    throw new SyntaxError(
      `Unsupported binary operator \`${
        node.operator
      }\`: \`${state.source.substring(node.start, node.end)}\``
    );
  },
  CallExpression(node: CallExpression, state, callback) {
    const calleeState: CookVisitorState<(...args: any[]) => any> =
      spawnCookState(state, {
        chainRef: state.chainRef,
      });
    callback(node.callee, calleeState);
    const calleeCooked = calleeState.cooked;

    // Sanitize the callee.
    sanitize(calleeCooked);

    if (
      (node.optional || calleeState.chainRef?.skipped) &&
      (calleeCooked === null || calleeCooked === undefined)
    ) {
      state.cooked = undefined;
      state.chainRef.skipped = true;
      return;
    }

    const cookedArgs = [];
    for (const arg of node.arguments) {
      const argState = spawnCookState(state);
      callback(arg, argState);
      if (arg.type === "SpreadElement") {
        cookedArgs.push(...argState.cooked);
      } else {
        cookedArgs.push(argState.cooked);
      }
    }

    if (typeof calleeCooked !== "function") {
      throw new TypeError(
        `${state.source.substring(
          node.callee.start,
          node.callee.end
        )} is not a function`
      );
    }

    const thisArg =
      node.callee.type === "MemberExpression" ||
      node.callee.type === "OptionalMemberExpression"
        ? calleeState.memberCooked.object
        : null;

    state.cooked = calleeCooked.apply(thisArg, cookedArgs);

    // Sanitize the call result.
    sanitize(state.cooked);
  },
  ChainExpression(node: ChainExpression, state, callback) {
    const chainState = spawnCookState(state, {
      chainRef: {},
    });
    callback(node.expression, chainState);
    state.cooked = chainState.cooked;
  },
  ConditionalExpression(node: ConditionalExpression, state, callback) {
    const testState = spawnCookState(state);
    callback(node.test, testState);

    if (testState.cooked) {
      const consequentState = spawnCookState(state);
      callback(node.consequent, consequentState);
      state.cooked = consequentState.cooked;
    } else {
      const alternateState = spawnCookState(state);
      callback(node.alternate, alternateState);
      state.cooked = alternateState.cooked;
    }
  },
  Identifier(node: Identifier, state: CookVisitorState) {
    if (state.assignment?.initializeOnly) {
      for (let i = state.scopeStack.length - 1; i >= 0; i--) {
        const ref = state.scopeStack[i].get(node.name);
        if (ref) {
          ref.cooked = state.assignment.rightCooked;
          ref.initialized = true;
          return;
        }
      }
      throw new ReferenceError(
        `Assignment left-hand side "${node.name}" is not found`
      );
    }

    if (state.identifierAsLiteralString) {
      state.cooked = node.name;
      return;
    }

    for (let i = state.scopeStack.length - 1; i >= 0; i--) {
      const ref = state.scopeStack[i].get(node.name);
      if (ref) {
        if (!ref.initialized) {
          if (state.checkTypeOf) {
            state.cooked = undefined;
            return;
          }
          throw new ReferenceError(
            `Cannot access '${node.name}' before initialization`
          );
        }
        if (state.assignment) {
          if (ref.const) {
            throw new TypeError(`Assignment to constant variable`);
          }
          performAssignment(
            state.assignment.operator,
            ref as unknown as Record<string, unknown>,
            "cooked",
            state.assignment.rightCooked
          );
        } else {
          state.cooked = ref.cooked;
        }
        return;
      }
    }

    if (state.checkTypeOf) {
      state.cooked = undefined;
      return;
    }

    throw new ReferenceError(`${node.name} is not defined`);
  },
  Literal(node: any, state) {
    if (node.regex) {
      if (node.value === null) {
        // Invalid regular expression fails silently in @babel/parser.
        throw new SyntaxError(`Invalid regular expression: ${node.raw}`);
      }
      if (node.regex.flags.includes("u")) {
        // Currently unicode flag is not fully supported across major browsers.
        throw new SyntaxError(
          `Unsupported unicode flag in regular expression: ${node.raw}`
        );
      }
    }
    state.cooked = node.value;
  },
  LogicalExpression(node: LogicalExpression, state, callback) {
    const leftState = spawnCookState(state);
    callback(node.left, leftState);

    const leftCooked = leftState.cooked;

    switch (node.operator) {
      case "||":
        if (leftCooked) {
          state.cooked = leftCooked;
          return;
        }
        break;
      case "&&":
        if (!leftCooked) {
          state.cooked = leftCooked;
          return;
        }
        break;
      case "??":
        if (leftCooked !== null && leftCooked !== undefined) {
          state.cooked = leftCooked;
          return;
        }
        break;
    }

    const rightState = spawnCookState(state);
    callback(node.right, rightState);

    state.cooked = rightState.cooked;
  },
  MemberExpression(node: MemberExpression, state, callback) {
    const objectState: CookVisitorState<ObjectCooked> = spawnCookState(state, {
      chainRef: state.chainRef,
    });
    callback(node.object, objectState);
    const objectCooked = objectState.cooked;

    // Sanitize the member object.
    sanitize(objectCooked);

    const objectCookedIsNil =
      objectCooked === null || objectCooked === undefined;
    if ((node.optional || objectState.chainRef?.skipped) && objectCookedIsNil) {
      state.cooked = undefined;
      state.chainRef.skipped = true;
      return;
    }

    const propertyState: CookVisitorState<PropertyCooked> = spawnCookState(
      state,
      {
        identifierAsLiteralString: !node.computed,
      }
    );
    callback(node.property, propertyState);

    const propertyCooked = propertyState.cooked;
    state.memberCooked = {
      object: objectCooked,
      property: propertyCooked,
    };

    if (objectCookedIsNil) {
      throw new TypeError(
        `Cannot ${
          state.assignment ? "set" : "read"
        } property '${propertyCooked}' of ${objectCooked}`
      );
    }

    if (state.assignment) {
      performAssignment(
        state.assignment.operator,
        objectCooked,
        propertyCooked,
        state.assignment.rightCooked
      );
    } else {
      state.cooked = objectCooked[propertyCooked];

      // Sanitize the accessed member.
      sanitize(state.cooked);
    }
  },
  ObjectExpression(
    node: ObjectExpression,
    state: CookVisitorState<ObjectCooked>,
    callback
  ) {
    const cookedEntries: PropertyEntryCooked[] = [];
    for (const prop of node.properties) {
      const propState: CookVisitorState<
        PropertyEntryCooked | PropertyEntryCooked[]
      > = spawnCookState(state, {
        spreadAsProperties: true,
      });
      callback(prop, propState);
      const propCooked = propState.cooked;
      if (prop.type === "SpreadElement") {
        if (propCooked !== null && propCooked !== undefined) {
          cookedEntries.push(
            ...Object.entries(propCooked as PropertyEntryCooked[])
          );
        }
      } else {
        cookedEntries.push(propCooked as PropertyEntryCooked);
      }
    }
    state.cooked = Object.fromEntries(cookedEntries);
  },
  ObjectPattern(node: ObjectPattern, state, callback) {
    if (state.assignment) {
      const rightCooked = state.assignment.rightCooked;
      if (rightCooked === null || rightCooked === undefined) {
        throw new TypeError(`Cannot destructure ${rightCooked}`);
      }
      const usedProps = new Set<PropertyCooked>();
      for (const prop of node.properties) {
        if (prop.type === "RestElement") {
          callback(
            prop,
            spawnCookState(state, {
              assignment: {
                ...state.assignment,
                rightCooked: Object.fromEntries(
                  Object.entries(rightCooked).filter(
                    (entry) => !usedProps.has(entry[0])
                  )
                ),
              },
            })
          );
        } else {
          const keyState: CookVisitorState<PropertyCooked> = spawnCookState(
            state,
            {
              identifierAsLiteralString: true,
            }
          );
          callback(prop.key, keyState);
          usedProps.add(keyState.cooked);
          callback(
            prop.value,
            spawnCookState(state, {
              assignment: {
                ...state.assignment,
                rightCooked:
                  rightCooked[keyState.cooked as keyof typeof rightCooked],
              },
            })
          );
        }
      }
      return;
    }

    /* // istanbul ignore else
    if (state.collectVariableNamesAsKind) {
      for (const prop of node.properties) {
        callback(prop, state);
      }
    } */
    // Should nerve reach here.
  },
  Property(
    node: ObjectProperty,
    state: CookVisitorState<PropertyEntryCooked>,
    callback
  ) {
    /* if (state.collectVariableNamesAsKind) {
      callback(node.value, state);
      return;
    } */

    const keyState: CookVisitorState<PropertyCooked> = spawnCookState(state, {
      identifierAsLiteralString: !node.computed,
    });
    callback(node.key, keyState);

    const valueState = spawnCookState(state);
    callback(node.value, valueState);

    state.cooked = [keyState.cooked, valueState.cooked];
  },
  RestElement(node: RestElement, state, callback) {
    callback(node.argument, state);
  },
  SequenceExpression(node: SequenceExpression, state, callback) {
    let expressionState: CookVisitorState;
    for (const expression of node.expressions) {
      expressionState = spawnCookState(state);
      callback(expression, expressionState);
    }
    state.cooked = expressionState.cooked;
  },
  SpreadElement(node: SpreadElement, state, callback) {
    const argumentState = spawnCookState(state);
    callback(node.argument, argumentState);
    const cooked = argumentState.cooked;
    if (!state.spreadAsProperties) {
      assertIterable(cooked, state.source, node.start, node.end);
    }
    state.cooked = cooked;
  },
  TaggedTemplateExpression(node: TaggedTemplateExpression, state, callback) {
    const tagState: CookVisitorState<(...args: unknown[]) => unknown> =
      spawnCookState(state);
    callback(node.tag, tagState);
    const tagCooked = tagState.cooked;

    sanitize(tagCooked);

    const tagArgs: [string[], ...unknown[]] = [
      node.quasi.quasis.map((quasi) => quasi.value.cooked),
    ];
    for (const expression of node.quasi.expressions) {
      const expressionState = spawnCookState(state);
      callback(expression, expressionState);
      tagArgs.push(expressionState.cooked);
    }

    if (typeof tagCooked !== "function") {
      throw new TypeError(
        `${state.source.substring(
          node.tag.start,
          node.tag.end
        )} is not a function`
      );
    }

    state.cooked = tagCooked(...tagArgs);
  },
  TemplateLiteral(node: TemplateLiteral, state, callback) {
    let index = 0;
    const chunk: string[] = [node.quasis[index].value.cooked];
    for (const expression of node.expressions) {
      const expressionState = spawnCookState(state);
      callback(expression, expressionState);
      chunk.push(String(expressionState.cooked));
      chunk.push(node.quasis[(index += 1)].value.cooked);
    }
    state.cooked = chunk.join("");
  },
  UnaryExpression(node: UnaryExpression, state, callback) {
    const argumentState = spawnCookState(state, {
      checkTypeOf: node.operator === "typeof",
    });
    callback(node.argument, argumentState);

    const argumentCooked = argumentState.cooked;

    switch (node.operator) {
      case "!":
        state.cooked = !argumentCooked;
        return;
      case "+":
        state.cooked = +argumentCooked;
        return;
      case "-":
        state.cooked = -argumentCooked;
        return;
      case "typeof":
        state.cooked = typeof argumentCooked;
        return;
      case "void":
        state.cooked = undefined;
        return;
    }

    throw new SyntaxError(
      `Unsupported unary operator \`${
        node.operator
      }\`: \`${state.source.substring(node.start, node.end)}\``
    );
  },
  NewExpression(node: NewExpression, state, callback) {
    if (node.callee.type === "Identifier") {
      if (!SupportedConstructorSet.has((node.callee as Identifier).name)) {
        throw new TypeError(
          `Unsupported constructor \`${
            node.callee.name
          }\`: \`${state.source.substring(node.start, node.end)}\``
        );
      }

      const calleeState: CookVisitorState<new (...args: any[]) => any> =
        spawnCookState(state);
      callback(node.callee, calleeState);
      const calleeCooked = calleeState.cooked;

      if (
        calleeCooked !==
        (window as Record<string, any>)[(node.callee as Identifier).name]
      ) {
        throw new TypeError(
          `Unsupported non-global constructor \`${
            node.callee.name
          }\`: \`${state.source.substring(node.start, node.end)}\``
        );
      }

      // Sanitize the callee.
      sanitize(calleeCooked);

      const cookedArgs = [];
      for (const arg of node.arguments) {
        const argState = spawnCookState(state);
        callback(arg, argState);
        if (arg.type === "SpreadElement") {
          cookedArgs.push(...argState.cooked);
        } else {
          cookedArgs.push(argState.cooked);
        }
      }

      state.cooked = new calleeCooked(...cookedArgs);
    } else {
      throw new TypeError(
        `Unsupported new expression: \`${state.source.substring(
          node.start,
          node.end
        )}\``
      );
    }
  },
});

// Ref https://github.com/tc39/proposal-global
// In addition, the es6-shim had to switch from Function('return this')()
// due to CSP concerns, such that the current check to handle browsers,
// node, web workers, and frames is:
// istanbul ignore next
function getGlobal(): any {
  // the only reliable means to get the global object is
  // `Function('return this')()`
  // However, this causes CSP violations in Chrome apps.
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw new Error("unable to locate global object");
}

/**
 * There are chances to construct a `Function` from a string, etc.
 * ```
 * ((a,b)=>a[b])(()=>1, 'constructor')('console.log(`yo`)')()
 * ```
 */
const reservedObjects = new WeakSet([
  // `Function("...")` is considered *extremely vulnerable*.
  Function,
  // `Object.assign()` is considered vulnerable.
  Object,
  // `prototype` is considered vulnerable.
  Function.prototype,
  Object.prototype,
  // Global `window` is considered vulnerable, too.
  getGlobal(),
]);

function sanitize(cooked: any): void {
  if (reservedObjects.has(cooked)) {
    throw new TypeError("Cannot access reserved objects such as `Function`.");
  }
}

function performAssignment(
  operator: string,
  object: Record<string, unknown>,
  property: unknown,
  value: unknown
): void {
  switch (operator) {
    case "=":
      object[property as keyof typeof object] = value;
      return;
    case "+=":
      (object[property as keyof typeof object] as number) += value as number;
      return;
    case "-=":
      (object[property as keyof typeof object] as number) -= value as number;
      return;
    case "*=":
      (object[property as keyof typeof object] as number) *= value as number;
      return;
    case "/=":
      (object[property as keyof typeof object] as number) /= value as number;
      return;
    case "%=":
      (object[property as keyof typeof object] as number) %= value as number;
      return;
  }

  throw new SyntaxError(`Unsupported assignment operator \`${operator}\``);
}
