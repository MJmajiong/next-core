const path = require("path");
const changeCase = require("change-case");

const pluginName = "ScanCustomElementsPlugin";

const legacyBrickNames = [
  "presentational-bricks.calendar",
  "workspace.container.shortcut-searchable-bar",
  "workspace.container.shortcut-searchable-list",
  "workspace.container.create-deploy-unit",
];
const validBrickName =
  /^[a-z][a-z0-9]*(-[a-z0-9]+)*\.[a-z][a-z0-9]*(-[a-z0-9]+)+$/;
const validProcessorName = /^[a-z][a-zA-Z0-9]*\.[a-z][a-zA-Z0-9]*$/;

module.exports = class ScanCustomElementsPlugin {
  constructor(packageName, dll = []) {
    this.packageName = packageName;
    this.camelPackageName = changeCase.camelCase(packageName);
    this.isProviderBricks = packageName.startsWith("providers-of-");
    this.dll = dll;
  }

  apply(compiler) {
    const brickSet = new Set();
    const processorSet = new Set();
    const providerSet = new Set();
    const brickEntries = new Map();

    compiler.hooks.normalModuleFactory.tap(pluginName, (factory) => {
      factory.hooks.parser.for("javascript/auto").tap(pluginName, (parser) => {
        parser.hooks.callAnyMember
          .for("customElements")
          .tap(pluginName, (expression) => {
            // `customElements.define(...)`
            if (
              expression.callee.property.name === "define" &&
              expression.arguments.length === 2
            ) {
              const { type, value } = expression.arguments[0];
              if (type === "Literal") {
                if (!value.startsWith(`${this.packageName}.`)) {
                  throw new Error(
                    `Invalid brick: "${value}", expecting prefixed with the package name: "${this.packageName}"`
                  );
                }

                if (
                  validBrickName.test(value) ||
                  legacyBrickNames.includes(value)
                ) {
                  brickSet.add(value);
                  if (!this.isProviderBricks) {
                    brickEntries.set(
                      value,
                      path.relative(process.cwd(), parser.state.module.resource)
                    );
                  }
                } else {
                  throw new Error(
                    `Invalid brick: "${value}", expecting: "PACKAGE-NAME.BRICK-NAME", where PACKAGE-NAME and BRICK-NAME must be lower-kebab-case, and BRICK-NAME must include a \`-\``
                  );
                }
              } else {
                throw new Error(
                  "Please call `customElements.define()` only with literal string"
                );
              }

              // `customElements.define(..., createProviderClass(...))`.
              // Ignore `providers-of-*.*` since they are all providers.
              if (!this.isProviderBricks) {
                const elementFactory = expression.arguments[1];
                if (
                  elementFactory.type === "CallExpression" &&
                  elementFactory.callee.type === "Identifier" &&
                  elementFactory.callee.name === "createProviderClass"
                ) {
                  providerSet.add(value);
                }
              }
            }
          });

        parser.hooks.statement.tap(pluginName, (statement) => {
          const { type, expression } = statement;

          // `getRuntime().registerCustomTemplate(...)`
          if (
            type === "ExpressionStatement" &&
            expression.type === "CallExpression" &&
            expression.callee.type === "MemberExpression" &&
            expression.callee.property.name === "registerCustomTemplate" &&
            expression.arguments.length === 2
          ) {
            const { type, value } = expression.arguments[0];
            if (type === "Literal") {
              if (!value.startsWith(`${this.packageName}.`)) {
                throw new Error(
                  `Invalid custom template: "${value}", expecting prefixed with the package name: "${this.packageName}"`
                );
              }
              brickSet.add(value);
            } else {
              throw new Error(
                "Please call `getRuntime().registerCustomTemplate()` only with literal string"
              );
            }
          }

          // `getRuntime().registerCustomProcessor(...)`
          if (
            type === "ExpressionStatement" &&
            expression.type === "CallExpression" &&
            expression.callee.type === "MemberExpression" &&
            expression.callee.property.name === "registerCustomProcessor" &&
            expression.arguments.length === 2
          ) {
            const { type, value } = expression.arguments[0];
            if (type === "Literal") {
              if (!value.startsWith(`${this.camelPackageName}.`)) {
                throw new Error(
                  `Invalid custom processor: "${value}", expecting prefixed with the camelCase package name: "${this.camelPackageName}"`
                );
              }

              if (!validProcessorName.test(value)) {
                throw new Error(
                  `Invalid custom processor: "${value}", expecting format of "camelPackageName.camelProcessorName"`
                );
              }
              processorSet.add(value);
            } else {
              throw new Error(
                "Please call `getRuntime().registerCustomProcessor()` only with literal string"
              );
            }
          }
        });

        parser.hooks.importSpecifier.tap(
          pluginName,
          (statement, source, exportName, identifierName) => {
            // Forbid usages such as `import Form from "antd/lib/form"`.
            // Because it could result in antd packed into the distributions.
            if (
              source.startsWith("antd/lib/") &&
              // Should never import *default* from `antd/lib/*`
              exportName === "default"
            ) {
              throw new Error(
                `Please do \`import { ${identifierName} } from "antd"\` instead of \`from "${source}"\``
              );
            }
          }
        );
      });
    });

    compiler.hooks.emit.tap(pluginName, (compilation) => {
      const bricks = Array.from(brickSet);
      const processors = Array.from(processorSet);
      const providers = Array.from(providerSet);

      const assetFilePath = Object.keys(compilation.assets).find(
        (filePath) => filePath.startsWith("index.") && filePath.endsWith(".js")
      );
      const jsFilePath =
        assetFilePath && `bricks/${this.packageName}/dist/${assetFilePath}`;

      const source = JSON.stringify(
        { bricks, processors, providers, dll: this.dll, filePath: jsFilePath },
        null,
        2
      );

      compilation.emitAsset("bricks.json", {
        source: () => source,
        size: () => source.length,
      });
      console.log("Defined bricks:", bricks);
      console.log("Defined processors:", processors);
      console.log("Defined providers:", providers);

      if (!this.isProviderBricks) {
        const entries = Object.fromEntries(brickEntries);
        const brickEntriesSource = JSON.stringify(entries, null, 2);
        compilation.emitAsset("brick-entries.json", {
          source: () => brickEntriesSource,
          size: () => brickEntriesSource.length,
        });
        console.log("Brick entries:", entries);
      }
    });
  }
};
