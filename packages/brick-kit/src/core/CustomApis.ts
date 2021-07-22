import { CustomApiOrchestration } from "./interfaces";

import yaml from "js-yaml";

// We can set `useProvider` to `${namespace}@${name}` to use custom api,so if provider includes "@",it's a custom api.
export function isCustomApiProvider(provider: string): boolean {
  return provider?.includes("@");
}

function getApiInfoFromMicroAppApiOrchestrationMap(
  provider: string,
  allMicroAppApiOrchestrationMap: Map<string, CustomApiOrchestration>
): {
  uri: string;
  method: string;
  name: string;
  namespace: string;
  responseWrapper: boolean;
  version?: string;
  isFileType?: boolean;
} {
  const api = allMicroAppApiOrchestrationMap.get(provider);
  if (api) {
    const contract: any =
      typeof api.contract === "string"
        ? yaml.safeLoad(api.contract, { schema: yaml.JSON_SCHEMA, json: true })
        : api.contract;
    const { uri, method = "GET" } = contract?.endpoint ?? {};
    // 框架或sdk会默认在response的object外封装一层{\"code\": 0, \"error\": \"\", \"message\": \"\", \"data\": response}, 如果想自定义整个response_message， 可以在response里面加上wrapper: false参数， wrapper默认为true。
    // 当 responseWrapper 为 true 时，provider 自动返回 data 的数据。
    const responseWrapper = contract?.response
      ? contract?.response.wrapper !== false
      : false;
    if (!uri) {
      throw new Error(
        'Please make sure the "${endpoint.uri}" field in contract of ' +
          `custom api "${provider}"` +
          " is correctly set."
      );
    } else {
      return {
        uri,
        method: method.toLowerCase() === "list" ? "get" : method,
        name: api.name,
        namespace: api.namespace,
        version: api.version,
        isFileType: contract?.response?.type === "file",
        responseWrapper,
      };
    }
  } else {
    throw new Error(
      `Custom API of "${provider}" cannot be found,please make sure it exists and has been exported.`
    );
  }
}

function getTransformedUriAndRestArgs(
  uri: string,
  actualArgs: any[],
  name: string,
  namespace: string,
  version?: string
): { url: string; args: any[] } {
  let i = 0;
  const prefix = version
    ? `api/gateway/${namespace}.${name}@${version}`
    : `api/gateway/api_service.${namespace}.${name}`;
  const transformedUri = uri.replace(/:([^/]+)/g, (_m, p) => {
    const realArg = actualArgs[i];
    i++;
    return realArg;
  });
  return {
    url: prefix + transformedUri,
    args: actualArgs.slice(i),
  };
}

export function getArgsOfCustomApi(
  provider: string,
  allMicroAppApiOrchestrationMap: Map<string, CustomApiOrchestration>,
  actualArgs: any[]
): any {
  const { uri, method, name, namespace, responseWrapper, version, isFileType } =
    getApiInfoFromMicroAppApiOrchestrationMap(
      provider,
      allMicroAppApiOrchestrationMap
    );

  let fileName: string;
  if (isFileType) {
    fileName = actualArgs.shift();
  }

  const { url, args } = getTransformedUriAndRestArgs(
    uri,
    actualArgs,
    name,
    namespace,
    version
  );

  return isFileType
    ? [
        fileName,
        {
          url,
          method,
          responseWrapper: false,
        },
        ...args,
        { responseType: "blob" },
      ]
    : [
        {
          url,
          method,
          responseWrapper,
        },
        ...args,
      ];
}
