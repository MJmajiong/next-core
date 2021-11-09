const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const HtmlWebpackTagsPlugin = require("html-webpack-tags-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const manifest = require("@next-core/brick-dll");
const {
  dll: { NextHashedModuleIdsPlugin, NextDllReferencePlugin },
} = require("@next-core/webpack-config-factory");
const packageJson = require("../package.json");
const brickDllVersion = require("@next-core/brick-dll/package.json").version;
const brickKitVersion = require("@next-core/brick-kit/package.json").version;
const brickUtilsVersion =
  require("@next-core/brick-utils/package.json").version;

const packageRoot = path.join(__dirname, "..");
const appRoot = path.join(packageRoot, "../..");

function getDllJsName(packageName, regExp) {
  return fs
    .readdirSync(
      path.join(require.resolve(`${packageName}/package.json`), "../dist"),
      {
        withFileTypes: true,
      }
    )
    .find((dirent) => dirent.isFile() && regExp.test(dirent.name)).name;
}

// Find all `@next-dll/*`.
const dll = Object.keys(packageJson.devDependencies)
  .filter((packageName) => packageName.startsWith("@next-dll/"))
  .map((packageName) => {
    const dllName = packageName.split("/").slice(-1)[0];
    return {
      packageName,
      dllName,
      jsName: getDllJsName(packageName, /^dll-of-[-\w]+\.\w+\.js$/),
    };
  });

const brickDllJsName = getDllJsName("@next-core/brick-dll", /^dll\.\w+\.js$/);

module.exports = ({ standalone } = {}) => {
  const htmlPath = standalone ? "../../" : "";
  const htmlPublicPath = standalone
    ? "<!--# echo var='app_root' -->-/core/"
    : "auto";
  const faviconPath = `${
    standalone ? "<!--# echo var='app_root' -->-/core/" : ""
  }assets/favicon.png`;
  const baseHref =
    process.env.SUBDIR === "true"
      ? "/next/"
      : process.env.NODE_ENV === "production"
      ? "<!--# echo var='base_href' default='/' -->"
      : "/";

  return {
    context: appRoot,
    entry: {
      polyfill: path.join(packageRoot, "src", "polyfill"),
      main: path.join(packageRoot, "src", "index"),
    },
    output: {
      path: path.join(
        __dirname,
        "..",
        standalone ? "dist-standalone/-/core" : "dist"
      ),
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      symlinks: false,
    },
    module: {
      rules: [
        {
          // Include ts, tsx, js, and jsx files.
          test: /\.(ts|js)x?$/,
          exclude: /node_modules/,
          loader: "babel-loader",
          options: {
            rootMode: "upward",
          },
        },
      ],
    },
    plugins: [
      new CopyPlugin({
        patterns: [
          path.join(
            require.resolve("@next-core/brick-dll/package.json"),
            standalone ? "../dist-standalone/*.js" : "../dist/*.js"
          ),
        ]
          .flatMap((filePath) => [filePath, `${filePath}.map`])
          .map((from) => ({
            from,
            to: "[name].[ext]",
            transform:
              standalone && /\.js$/.test(from)
                ? (content, absoluteFrom) => {
                    if (!/dll\.[^.]+\.js$/.test(absoluteFrom)) {
                      return content;
                    }
                    const space = absoluteFrom.endsWith("dll.bundle.js")
                      ? " "
                      : "";
                    return content
                      .toString()
                      .replace(
                        `.p${space}=${space}"STANDALONE_DLL_PUBLIC_PATH"`,
                        `.p${space}=${space}"".concat(window.PUBLIC_ROOT,"core/")`
                      );
                  }
                : undefined,
          })),
      }),
      new CopyPlugin({
        patterns: dll
          .map((d) => d.packageName)
          .map((packageName) =>
            path.join(
              require.resolve(`${packageName}/package.json`),
              "../dist/*.js"
            )
          )
          .flatMap((filePath) => [filePath, `${filePath}.map`])
          .map((from) => ({
            from,
            to: "[name].[ext]",
          })),
      }),
      new CopyPlugin({
        patterns: [
          {
            from: path.resolve(packageRoot, "./assets"),
            to: "assets",
          },
        ],
      }),
      new CopyPlugin({
        patterns: [
          {
            from: `${path.resolve(
              require.resolve("@next-core/illustrations/package.json"),
              "../dist/illustrations"
            )}`,
            to: "assets/illustrations",
          },
        ],
      }),
      new HtmlWebpackPlugin({
        filename: `${htmlPath}index.html`,
        publicPath: htmlPublicPath,
        title: "DevOps 管理专家",
        baseHref,
        template: path.join(packageRoot, "src", "index.ejs"),
        faviconPath,
      }),
      new HtmlWebpackPlugin({
        filename: `${htmlPath}browse-happy.html`,
        publicPath: htmlPublicPath,
        title: "DevOps 管理专家",
        baseHref,
        template: path.join(packageRoot, "src", "browse-happy.ejs"),
        faviconPath,
        chunks: [],
      }),
      new HtmlWebpackTagsPlugin({
        files: [`${htmlPath}index.html`],
        scripts: [
          {
            path: brickDllJsName,
            // Always append the `dll` before any other scripts.
            append: false,
          },
        ],
      }),
      new NextHashedModuleIdsPlugin(),
      new NextDllReferencePlugin({
        context: appRoot,
        manifest,
      }),
      new webpack.DefinePlugin({
        // Ref https://webpack.js.org/plugins/define-plugin/
        // > If the value is a string it will be used as a code fragment.
        BRICK_NEXT_VERSIONS: JSON.stringify({
          ["brick-container"]: packageJson.version,
          ["brick-dll"]: brickDllVersion,
          ["brick-kit"]: brickKitVersion,
          ["brick-utils"]: brickUtilsVersion,
        }),
        BRICK_NEXT_FEATURES: JSON.stringify([
          "edit-evaluations-and-transformations-in-devtools",
        ]),
        // Recording dll js path which contains hash for long-term-caching.
        DLL_PATH: JSON.stringify(
          Object.fromEntries(
            dll.map(({ dllName, jsName }) => [dllName, jsName])
          )
        ),
        STANDALONE_MICRO_APPS: JSON.stringify(!!standalone),
      }),
    ],
  };
};
