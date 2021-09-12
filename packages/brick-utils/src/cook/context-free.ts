import {
  BinaryExpression,
  UnaryExpression,
  VariableDeclaration,
} from "@babel/types";
import {
  CompletionRecord,
  Empty,
  EnvironmentRecord,
  NormalCompletion,
  ReferenceRecord,
} from "./ExecutionContext";
import { collectBoundNames } from "./traverse";
import { isIterable } from "./utils";

// https://tc39.es/ecma262/#sec-ispropertyreference
export function IsPropertyReference(V: ReferenceRecord): boolean {
  return V.Base !== "unresolvable" && !(V.Base instanceof EnvironmentRecord);
}

// https://tc39.es/ecma262/#sec-initializereferencedbinding
export function InitializeReferencedBinding(
  V: ReferenceRecord,
  W: unknown
): CompletionRecord {
  const base = V.Base as EnvironmentRecord;
  return base.InitializeBinding(V.ReferenceName as string, W);
}

// https://tc39.es/ecma262/#sec-copydataproperties
export function CopyDataProperties(
  target: Record<PropertyKey, unknown>,
  source: unknown,
  excludedItems: PropertyKey[]
): Record<PropertyKey, unknown> {
  if (source === undefined || source === null) {
    return target;
  }
  const keys = (Object.getOwnPropertyNames(source) as PropertyKey[]).concat(
    Object.getOwnPropertySymbols(source)
  );
  for (const nextKey of keys) {
    if (!excludedItems.includes(nextKey)) {
      const desc = Object.getOwnPropertyDescriptor(source, nextKey);
      if (desc?.enumerable) {
        target[nextKey] = (source as Record<PropertyKey, unknown>)[nextKey];
      }
    }
  }
  return target;
}

// https://tc39.es/ecma262/#sec-runtime-semantics-fordeclarationbindinginstantiation
export function ForDeclarationBindingInstantiation(
  forDeclaration: VariableDeclaration,
  env: EnvironmentRecord
): void {
  const isConst = forDeclaration.kind === "const";
  for (const name of collectBoundNames(forDeclaration.declarations)) {
    if (isConst) {
      env.CreateImmutableBinding(name, true);
    } else {
      env.CreateMutableBinding(name, false);
    }
  }
}

// https://tc39.es/ecma262/#sec-loopcontinues
export function LoopContinues(completion: CompletionRecord): boolean {
  return completion.Type === "normal" || completion.Type == "continue";
}

// https://tc39.es/ecma262/#sec-updateempty
export function UpdateEmpty(
  completion: CompletionRecord,
  value: unknown
): CompletionRecord {
  if (completion.Value !== Empty) {
    return completion;
  }
  return new CompletionRecord(completion.Type, value);
}

// https://tc39.es/ecma262/#sec-getvalue
export function GetValue(V: unknown): unknown {
  if (V instanceof CompletionRecord) {
    if (V.Type === "normal") {
      V = V.Value;
    } else {
      return V;
    }
  }
  if (!(V instanceof ReferenceRecord)) {
    return V;
  }
  if (V.Base === "unresolvable") {
    throw new ReferenceError(`${V.ReferenceName as string} is not defined`);
  }
  if (V.Base instanceof EnvironmentRecord) {
    const base = V.Base as EnvironmentRecord;
    return base.GetBindingValue(V.ReferenceName as string, V.Strict);
  }
  return V.Base[V.ReferenceName];
}

// https://tc39.es/ecma262/#sec-topropertykey
export function ToPropertyKey(arg: unknown): string | symbol {
  if (typeof arg === "symbol") {
    return arg;
  }
  return String(arg);
}

// https://tc39.es/ecma262/#sec-getv
export function GetV(V: unknown, P: PropertyKey): unknown {
  return (V as Record<PropertyKey, unknown>)[P];
}

// https://tc39.es/ecma262/#sec-putvalue
export function PutValue(V: ReferenceRecord, W: unknown): CompletionRecord {
  if (!(V instanceof ReferenceRecord)) {
    throw new ReferenceError();
  }
  if (V.Base === "unresolvable") {
    throw new ReferenceError(`${V.ReferenceName as string} is not defined`);
  }
  if (V.Base instanceof EnvironmentRecord) {
    return V.Base.SetMutableBinding(V.ReferenceName as string, W, V.Strict);
  }
  V.Base[V.ReferenceName] = W;
  return NormalCompletion(undefined);
}

// https://tc39.es/ecma262/#sec-createlistiteratorRecord
export function CreateListIteratorRecord(
  args: Iterable<unknown>
): Iterator<unknown> {
  if (!isIterable(args)) {
    throw new TypeError(`${typeof args} is not iterable`);
  }
  return args[Symbol.iterator]();
}

// https://tc39.es/ecma262/#sec-requireobjectcoercible
export function RequireObjectCoercible(arg: unknown): void {
  if (arg === null || arg === undefined) {
    throw new TypeError("Cannot destructure properties of undefined or null");
  }
}

// https://tc39.es/ecma262/#sec-getidentifierreference
export function GetIdentifierReference(
  env: EnvironmentRecord,
  name: string,
  strict: boolean
): ReferenceRecord {
  if (!env) {
    return new ReferenceRecord("unresolvable", name, strict);
  }
  if (env.HasBinding(name)) {
    return new ReferenceRecord(env, name, strict);
  }
  return GetIdentifierReference(env.OuterEnv, name, strict);
}

// https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator
export function ApplyStringOrNumericBinaryOperator(
  leftValue: number,
  operator: BinaryExpression["operator"] | "|>",
  rightValue: number
): unknown {
  switch (operator) {
    case "+":
      return leftValue + rightValue;
    case "-":
      return leftValue - rightValue;
    case "/":
      return leftValue / rightValue;
    case "%":
      return leftValue % rightValue;
    case "*":
      return leftValue * rightValue;
    case "**":
      return leftValue ** rightValue;
    case "==":
      return leftValue == rightValue;
    case "===":
      return leftValue === rightValue;
    case "!=":
      return leftValue != rightValue;
    case "!==":
      return leftValue !== rightValue;
    case ">":
      return leftValue > rightValue;
    case "<":
      return leftValue < rightValue;
    case ">=":
      return leftValue >= rightValue;
    case "<=":
      return leftValue <= rightValue;
  }
  throw new SyntaxError(`Unsupported binary operator \`${operator}\``);
}

// https://tc39.es/ecma262/#sec-assignment-operators
export function ApplyStringOrNumericAssignment(
  leftValue: string | number,
  operator: string,
  rightValue: string | number
): unknown {
  switch (operator) {
    case "+=":
    case "-=":
    case "*=":
    case "/=":
    case "%=":
    case "**=":
      return ApplyStringOrNumericBinaryOperator(
        leftValue as number,
        operator.substr(0, operator.length - 1) as BinaryExpression["operator"],
        rightValue as number
      );
  }

  throw new SyntaxError(`Unsupported assignment operator \`${operator}\``);
}

// https://tc39.es/ecma262/#sec-unary-operators
export function ApplyUnaryOperator(
  target: unknown,
  operator: UnaryExpression["operator"]
): unknown {
  switch (operator) {
    case "!":
      return !target;
    case "+":
      return +target;
    case "-":
      return -target;
    case "void":
      return undefined;
  }
  throw new SyntaxError(`Unsupported unary operator \`${operator}\``);
}
