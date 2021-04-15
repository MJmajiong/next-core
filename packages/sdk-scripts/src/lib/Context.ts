import os from "os";
import path from "path";
import * as changeCase from "change-case";
import prettier from "prettier";
import yaml from "js-yaml";
import { Api, Model } from "./internal";
import { FileWithContent } from "../interface";
import { normalizeSemver } from "../utils";

export class Context {
  readonly apiMap = new Map<string, Api>();
  readonly modelMap = new Map<string, Model>();
  readonly apiByModelExportsMap = new Map<string, string[]>();
  readonly modelByServiceExportsMap = new Map<string, string[]>();
  readonly indexApiExports: string[] = [];
  readonly indexModelExports: string[] = [];
  readonly serviceSeg: string;

  constructor(serviceSeg: string) {
    this.serviceSeg = serviceSeg;
  }

  toFiles(sdkRoot: string): FileWithContent[] {
    const apiByModelIndexes = Array.from(
      this.apiByModelExportsMap.entries()
    ).map(([modelSeg, apis]) => ({
      filePath: `./api/${this.serviceSeg}/${modelSeg}/index`,
      toString: () => apis.map((api) => [`export * from "./${api}"`]).join(";"),
    }));

    const modelByServiceIndexes = Array.from(
      this.modelByServiceExportsMap.entries()
    ).map(([serviceSeg, models]) => ({
      filePath: `./model/${serviceSeg}/index`,
      toString: () =>
        models.map((model) => [`export * from "./${model}"`]).join(";"),
    }));

    const sdkIndexExports = this.indexApiExports
      .map(
        (modelSeg) => `export * from "./api/${this.serviceSeg}/${modelSeg}";`
      )
      .concat(
        this.indexModelExports.map(
          (serviceSeg) =>
            `export * as ${changeCase.pascalCase(
              serviceSeg
            )}Models from "./model/${serviceSeg}";`
        )
      )
      .join(os.EOL);

    const sdkIndex = {
      filePath: "./index",
      toString: () => sdkIndexExports,
    };

    const contractsYaml: FileWithContent = [
      path.join(sdkRoot, "deploy", "contracts.yaml"),
      yaml.safeDump({
        depend_contracts: Array.from(this.apiMap.values()).map((api) => ({
          name: `easyops.api.${this.serviceSeg}.${api.modelSeg}.${api.originalName}`,
          version: `^${normalizeSemver(api.doc.version)}`,
        })),
      }),
    ];

    return [
      ...Array.from(this.apiMap.values()),
      ...Array.from(this.modelMap.values()),
      ...apiByModelIndexes,
      ...modelByServiceIndexes,
      sdkIndex,
    ]
      .map<FileWithContent>((file) => [
        path.join(sdkRoot, "src", file.filePath + ".ts"),
        prettier.format(file.toString(), { parser: "typescript" }),
      ])
      .concat([contractsYaml]);
  }
}
