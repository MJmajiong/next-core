import {
  FunctionDeclaration,
  VariableDeclaration,
  VariableDeclarator,
} from "@babel/types";
import { EstreeNode } from "./interfaces";

type InternalCollect<T = void, O = unknown> = (
  node: EstreeNode | EstreeNode[],
  options?: O
) => T;
type InternalCollectWithOptions<T = void, O = unknown> = (
  node: EstreeNode | EstreeNode[],
  options: O
) => T;

export function collectBoundNames(
  root: EstreeNode | EstreeNode[]
): Set<string> {
  const names = new Set<string>();
  const collect: InternalCollect = (node) => {
    if (Array.isArray(node)) {
      for (const n of node) {
        collect(n);
      }
    } else if (node) {
      // `node` maybe `null` in some cases.
      switch (node.type) {
        case "Identifier":
          names.add(node.name);
          return;
        case "VariableDeclaration":
          collect(node.declarations);
          return;
        case "VariableDeclarator":
          collect(node.id);
          return;
        case "ArrayPattern":
          collect(node.elements);
          return;
        case "AssignmentPattern":
          collect(node.left);
          return;
        case "ObjectPattern":
          collect(node.properties);
          return;
        case "Property":
          collect(node.value);
          return;
        case "RestElement":
          collect(node.argument);
          return;
        case "FunctionDeclaration":
          collect(node.id);
          return;
      }
    }
  };
  collect(root);
  return names;
}

export function containsExpression(root: EstreeNode | EstreeNode[]): boolean {
  const collect: InternalCollect<boolean> = (node) => {
    if (Array.isArray(node)) {
      return node.some(collect);
    } else if (node) {
      // `node` maybe `null` in some cases.
      switch (node.type) {
        case "ArrayPattern":
          return collect(node.elements);
        case "AssignmentPattern":
          return true;
        case "ObjectPattern":
          return collect(node.properties);
        case "Property":
          return node.computed || collect(node.value);
        case "RestElement":
          return collect(node.argument);
      }
    }
  };
  return collect(root);
}

interface ScopedDeclarationOptions {
  var?: boolean;
  topLevel?: boolean;
}

type ScopedDeclaration =
  | VariableDeclarator
  | VariableDeclaration
  | FunctionDeclaration;

export function collectScopedDeclarations(
  root: EstreeNode | EstreeNode[],
  options: ScopedDeclarationOptions
): ScopedDeclaration[] {
  const declarations: ScopedDeclaration[] = [];
  const nextOptions = { var: options.var };
  const collect: InternalCollectWithOptions<void, ScopedDeclarationOptions> = (
    node,
    options
  ): void => {
    if (Array.isArray(node)) {
      for (const n of node) {
        collect(n, options);
      }
    } else if (node) {
      // `node` maybe `null` in some cases.
      switch (node.type) {
        case "FunctionDeclaration":
          // At the top level of a function, or script, function declarations are
          // treated like var declarations rather than like lexical declarations.
          // See https://tc39.es/ecma262/#sec-static-semantics-toplevellexicallydeclarednames
          if (Number(!options.var) ^ Number(options.topLevel)) {
            declarations.push(node);
          }
          return;
        case "VariableDeclaration":
          if (Number(!options.var) ^ Number(node.kind === "var")) {
            collect(node.declarations, nextOptions);
          }
          return;
        case "VariableDeclarator":
          declarations.push(node);
          return;
        case "SwitchCase":
          collect(node.consequent, nextOptions);
          return;
        case "CatchClause":
          collect(node.body, nextOptions);
          return;
      }
      if (options.var) {
        switch (node.type) {
          case "BlockStatement":
            collect(node.body, nextOptions);
            return;
          case "IfStatement":
            collect(node.consequent, nextOptions);
            collect(node.alternate, nextOptions);
            return;
          case "DoWhileStatement":
          case "WhileStatement":
            collect(node.body, nextOptions);
            return;
          case "ForStatement":
            collect(node.init, nextOptions);
            collect(node.body, nextOptions);
            return;
          case "ForInStatement":
          case "ForOfStatement":
            collect(node.left, nextOptions);
            collect(node.body, nextOptions);
            return;
          case "SwitchStatement":
            collect(node.cases, nextOptions);
            return;
          case "TryStatement":
            collect(node.block, nextOptions);
            collect(node.handler, nextOptions);
            collect(node.finalizer, nextOptions);
            return;
        }
      }
    }
  };
  collect(root, options);
  return declarations;
}

export function getDeclaredNames(
  declarations: ScopedDeclaration[]
): Set<string> {
  const names = new Set<string>();
  for (const d of declarations) {
    for (const n of collectBoundNames(d)) {
      names.add(n);
    }
  }
  return names;
}
