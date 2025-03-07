import yaml from "js-yaml";
import { cloneDeep } from "lodash";
import {
  BrickConf,
  BuilderBrickNode,
  BuilderCustomTemplateNode,
  BuilderRouteNode,
  BuilderRouteOrBrickNode,
  BuilderSnippetNode,
  RouteConf,
  SeguesConf,
} from "@next-core/brick-types";
import { isBrickNode, isRouteNode } from "./assertions";

const jsonFieldsInRoute = [
  "menu",
  "providers",
  "segues",
  "defineResolves",
  "redirect",
  "analyticsData",
];

// Fields stored as yaml string will be parsed when build & push.
const yamlFieldsInRoute = ["permissionsPreCheck"];

const jsonFieldsInBrick = [
  "properties",
  "events",
  "lifeCycle",
  "params",
  "if",
  "transform",
];

// Fields stored as yaml string will be parsed when build & push.
const yamlFieldsInBrick = ["permissionsPreCheck", "transformFrom"];

// Fields started with `_` will be removed by default.
const fieldsToRemoveInRoute = [
  "appId",
  "children",
  "creator",
  "ctime",
  "id",
  "instanceId",
  "graphInfo",
  "modifier",
  "mountPoint",
  "mtime",
  "org",
  "parent",
  "sort",
  "name",
  "providersBak",
  "providers_bak",

  "deleteAuthorizers",
  "readAuthorizers",
  "updateAuthorizers",
];

const fieldsToRemoveInBrick = fieldsToRemoveInRoute.concat("type", "alias");

// Those fields can be disposed if value is null.
const disposableNullFields = [
  "alias",
  "documentId",
  "hybrid",
  "bg",
  "context",
  "exports",
  "ref",
  "portal",
  "analyticsData",
];

export function normalizeBuilderNode(node: BuilderBrickNode): BrickConf;
export function normalizeBuilderNode(node: BuilderRouteNode): RouteConf;
export function normalizeBuilderNode(
  node: BuilderCustomTemplateNode | BuilderSnippetNode
): null;
export function normalizeBuilderNode(
  node: BuilderRouteOrBrickNode
): BrickConf | RouteConf | null;
export function normalizeBuilderNode(
  node: BuilderRouteOrBrickNode
): BrickConf | RouteConf | null {
  if (isBrickNode(node)) {
    return normalize(
      node,
      fieldsToRemoveInBrick,
      jsonFieldsInBrick,
      yamlFieldsInBrick,
      false
    ) as unknown as BrickConf;
  }
  if (isRouteNode(node)) {
    return normalize(
      node,
      fieldsToRemoveInRoute,
      jsonFieldsInRoute,
      yamlFieldsInRoute,
      true
    ) as unknown as RouteConf;
  }
  return null;
}

function normalize(
  node: BuilderRouteOrBrickNode,
  fieldsToRemove: string[],
  jsonFields: string[],
  yamlFields: string[],
  cleanUpSegues?: boolean
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(node)
      // Remove unused fields from CMDB.
      // Consider fields started with `_` as unused.
      .filter(
        ([key, value]) =>
          !(
            key[0] === "_" ||
            fieldsToRemove.includes(key) ||
            (value === null && disposableNullFields.includes(key))
          )
      )
      // Parse specific fields.
      .map(([key, value]) => [
        key,
        cleanUpSegues && key === "segues"
          ? getCleanSegues(value as string)
          : jsonFields.includes(key)
          ? safeJsonParse(value as string)
          : yamlFields.includes(key)
          ? safeYamlParse(value as string)
          : cloneDeep(value),
      ])
  );
}

// Clear `segue._view` which is for development only.
function getCleanSegues(string: string): SeguesConf {
  const segues = safeJsonParse(string);
  return (
    segues &&
    Object.fromEntries(
      Object.entries(segues).map(([id, segue]) => [
        id,
        segue && {
          target: segue.target,
        },
      ])
    )
  );
}

function safeJsonParse(value: string): unknown {
  if (!value) {
    return;
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("JSON.parse() failed", value);
  }
}

function safeYamlParse(value: string): unknown {
  if (!value) {
    return;
  }
  try {
    const result = yaml.safeLoad(value, {
      schema: yaml.JSON_SCHEMA,
      json: true,
    });
    return result;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("Failed to parse yaml string", value);
  }
}
