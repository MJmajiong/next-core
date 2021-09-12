import {
  Expression,
  FunctionDeclaration,
  Node,
  ObjectPattern,
  ObjectProperty,
  RestElement,
  UnaryExpression,
  VariableDeclaration,
} from "@babel/types";
import { ExecutionContext } from "./ExecutionContext";
import { CookScope, PrecookScope } from "./Scope";

export type EstreeNode =
  | Node
  | EstreeObjectPattern
  | EstreeProperty
  | EstreeChainExpression
  | EstreeLiteral;

export type EstreeObjectPattern = Omit<ObjectPattern, "properties"> & {
  properties: (EstreeProperty | RestElement)[];
}

export type EstreeProperty = Omit<ObjectProperty, "type"> & {
  type: "Property";
};

export interface EstreeChainExpression {
  type: "ChainExpression";
  expression: Expression;
}

export interface EstreeLiteral {
  type: "Literal";
  value: unknown;
  raw: string;
  regex?: {
    flags: string;
  };
}

export interface PrecookOptions {
  visitors?: Record<string, VisitorFn<PrecookVisitorState>>;
}

export interface PrecookFunctionOptions extends PrecookOptions {
  typescript?: boolean;
}

export interface PrecookVisitorState {
  scopeStack: PrecookScope[];
  attemptToVisitGlobals: Set<string>;
  scopeMapByNode: WeakMap<Node, PrecookScope>;
  ctx?: ExecutionContext;
  isRoot?: boolean;
  identifierAsLiteralString?: boolean;
  collectVariableNamesAsKind?: ScopeVariableKind;
  isFunctionBody?: boolean;
  hoisting?: boolean;
}

export type ScopeVariableKind =
  | "param"
  | VariableDeclaration["kind"]
  | "functions";

export interface BasePreResult {
  source: string;
  attemptToVisitGlobals: Set<string>;
  scopeMapByNode: WeakMap<Node, PrecookScope>;
}

export interface PrecookResult extends BasePreResult {
  expression: Expression;
}

export interface CookVisitorState<T = unknown> {
  source: string;
  rules: CookRules;
  scopeMapByNode: WeakMap<Node, PrecookScope>;
  scopeStack: CookScope[];
  raiseError: FnRaiseError;
  cookingFunction?: boolean;
  ctx?: ExecutionContext;
  isRoot?: boolean;
  identifierAsLiteralString?: boolean;
  spreadAsProperties?: boolean;
  isFunctionBody?: boolean;
  hoisting?: boolean;
  unaryOperator?: UnaryExpression["operator"];
  assignment?: CookAssignmentData;
  update?: CookUpdateData;
  chainRef?: {
    skipped?: boolean;
  };
  memberCooked?: {
    object: ObjectCooked;
    property: PropertyCooked;
  };
  returns?: {
    returned: boolean;
    cooked?: unknown;
  };
  switches?: {
    discriminantCooked?: unknown;
    caseFound?: boolean;
    caseFoundSecond?: boolean;
    caseStage?: "first" | "second" | "repeat-second";
  };
  breakableFlow?: {
    broken?: boolean;
  };
  continuableFlow?: {
    continued?: boolean;
  };
  caughtError?: unknown;
  cooked?: T;
}

export interface CookAssignmentData {
  operator?: string;
  initializing?: boolean;
  rightCooked?: unknown;
}

export interface CookUpdateData {
  operator: "++" | "--";
  prefix: boolean;
}

export type PropertyCooked = string | number;
export type PropertyEntryCooked = [PropertyCooked, unknown];
export type ObjectCooked = Record<PropertyCooked, unknown>;

export type VisitorCallback<T> = (node: any, state: T) => void;

export type VisitorFn<T, N = any> = (
  node: N,
  state: T,
  callback: VisitorCallback<T>
) => void;

export interface PrecookFunctionResult extends BasePreResult {
  function: FunctionDeclaration;
  rootBlockScope: PrecookScope;
}

export interface ICookVisitor {
  [key: string]: VisitorFn<CookVisitorState>;
}

export interface CookFunctionOptions {
  rules?: CookRules;
  globalVariables?: Record<string, unknown>;
}

export interface CookRules {
  noVar?: boolean;
}

// export type FnRaiseError = (
//   error: ErrorConstructor,
//   message: string,
//   node?: Node
// ) => void;

export interface FnRaiseError {
  (error: ErrorConstructor, message: string, node?: Node): void;

  notFunction: (node: Node) => void;
}
