const path = require("path");
const bodyParser = require("body-parser");
const { escapeRegExp } = require("lodash");
const {
  getNavbar,
  getStoryboardsByMicroApps,
  getBrickPackages,
  getSettings,
  getTemplatePackages,
  getSingleStoryboard,
  tryServeFiles,
} = require("./utils");

module.exports = (env, app) => {
  const {
    useOffline,
    useRemote,
    baseHref,
    localBrickPackages,
    localEditorPackages,
    localMicroApps,
    localTemplates,
    microAppsDir,
    brickPackagesDir,
    alternativeBrickPackagesDir,
    templatePackagesDir,
    mocked,
    mockedMicroAppsDir,
    mockedMicroApps,
    standaloneMicroApps,
    standaloneAppDir,
  } = env;
  let username;

  // 开发时默认拦截 bootstrap 请求。
  // 如果设定 `REMOTE=true`，则透传远端请求。
  if (useRemote) {
    // 设定透传远端请求时，可以指定特定的 brick packages, micro apps, template packages 使用本地文件。
    localEditorPackages.forEach((pkgId) => {
      // 直接返回本地构件库编辑器相关文件。
      app.get(`${baseHref}bricks/${pkgId}/dist/editors/*`, (req, res) => {
        tryServeFiles(
          [
            path.join(brickPackagesDir, pkgId, "dist-editors", req.params[0]),
            path.join(brickPackagesDir, pkgId, "dist/editors", req.params[0]),
            path.join(
              alternativeBrickPackagesDir,
              pkgId,
              "dist-editors",
              req.params[0]
            ),
            path.join(
              alternativeBrickPackagesDir,
              pkgId,
              "dist/editors",
              req.params[0]
            ),
          ],
          req,
          res
        );
      });
    });

    localBrickPackages.forEach((pkgId) => {
      // 直接返回本地构件库相关文件（但排除编辑器相关文件）。
      app.get(
        new RegExp(
          `^${escapeRegExp(
            `${baseHref}bricks/${pkgId}/`
          )}(?!dist\\/editors\\/)(.+)`
        ),
        (req, res) => {
          tryServeFiles(
            [
              path.join(brickPackagesDir, pkgId, req.params[0]),
              path.join(alternativeBrickPackagesDir, pkgId, req.params[0]),
            ],
            req,
            res
          );
        }
      );
    });

    localMicroApps.forEach((appId) => {
      // 直接返回本地小产品相关文件。
      app.get(`${baseHref}micro-apps/${appId}/*`, (req, res) => {
        const filePath = path.join(microAppsDir, appId, req.params[0]);
        tryServeFiles(filePath, req, res);
      });
    });
    localTemplates.forEach((pkgId) => {
      // 直接返回本地模板相关文件。
      app.get(`${baseHref}templates/${pkgId}/*`, (req, res) => {
        const filePath = path.join(templatePackagesDir, pkgId, req.params[0]);
        tryServeFiles(filePath, req, res);
      });
    });
    mockedMicroApps.forEach((appId) => {
      // 直接返回本地小产品相关文件。
      app.get(`${baseHref}micro-apps/${appId}/*`, (req, res) => {
        const filePath = path.join(mockedMicroAppsDir, appId, req.params[0]);
        tryServeFiles(filePath, req, res);
      });
      app.get(`${baseHref}api/auth(/v2)?/bootstrap/${appId}`, (req, res) => {
        res.json({
          code: 0,
          data: getSingleStoryboard(env, appId, true),
        });
      });
    });
    // API to fulfil the active storyboard.
    localMicroApps.concat(mockedMicroApps).forEach((appId) => {
      app.get(`${baseHref}api/auth(/v2)?/bootstrap/${appId}`, (req, res) => {
        res.json({
          code: 0,
          data: getSingleStoryboard(
            env,
            appId,
            mockedMicroApps.includes(appId)
          ),
        });
      });
    });
  } else {
    const publicRoot = standaloneMicroApps
      ? `${baseHref}${standaloneAppDir}-/`
      : baseHref;
    if (standaloneMicroApps) {
      app.get(`${publicRoot}bootstrap.hash.json`, (req, res) => {
        res.json({
          navbar: getNavbar(env),
          storyboards: (mocked
            ? getStoryboardsByMicroApps(env, true, {
                brief: req.query.brief === "true",
              })
            : []
          ).concat(
            getStoryboardsByMicroApps(env, false, {
              brief: req.query.brief === "true",
            })
          ),
          brickPackages: getBrickPackages(env),
          templatePackages: getTemplatePackages(env),
        });
      });
    } else {
      app.get(`${baseHref}api/auth(/v2)?/bootstrap`, (req, res) => {
        res.json({
          code: 0,
          data: {
            navbar: getNavbar(env),
            storyboards: (mocked
              ? getStoryboardsByMicroApps(env, true, {
                  brief: req.query.brief === "true",
                })
              : []
            ).concat(
              getStoryboardsByMicroApps(env, false, {
                brief: req.query.brief === "true",
              })
            ),
            brickPackages: getBrickPackages(env),
            templatePackages: getTemplatePackages(env),
            settings: getSettings(env),
          },
        });
      });

      app.get(`${baseHref}api/auth(/v2)?/bootstrap/:appId`, (req, res) => {
        res.json({
          code: 0,
          data: getSingleStoryboard(
            env,
            req.params.appId,
            mockedMicroApps.includes(req.params.appId)
          ),
        });
      });
    }

    // 直接返回构件库 js 文件。
    app.get(`${publicRoot}bricks/*`, (req, res) => {
      tryServeFiles(
        [
          path.join(brickPackagesDir, req.params[0]),
          path.join(alternativeBrickPackagesDir, req.params[0]),
        ],
        req,
        res
      );
    });

    // 直接返回小产品相关文件。
    app.get(`${publicRoot}micro-apps/*`, (req, res) => {
      tryServeFiles(
        [
          ...(mocked ? [path.join(mockedMicroAppsDir, req.params[0])] : []),
          path.join(microAppsDir, req.params[0]),
        ],
        req,
        res
      );
    });

    // 直接返回模板库 js 文件。
    app.get(`${publicRoot}templates/*`, (req, res) => {
      const filePath = path.join(templatePackagesDir, req.params[0]);
      tryServeFiles(filePath, req, res);
    });
  }

  if (useOffline) {
    // 离线开发模式下，mock API 请求。
    // 校验登录。
    app.get(`${baseHref}api/auth/login`, (req, res) => {
      res.json({
        code: 0,
        data: {
          loggedIn: !!username,
          username,
          org: 8888,
        },
      });
    });

    // 执行登录。
    app.post(`${baseHref}api/auth/login`, bodyParser.json(), (req, res) => {
      // Enter any username and the same as password to get logged in,
      // such as `duck` / `duck`.
      if (req.body.username && req.body.username === req.body.password) {
        username = req.body.username;
        res.json({
          code: 0,
          data: {
            loggedIn: true,
            username,
            org: 8888,
          },
        });
      } else {
        res.status(401);
        res.json({
          code: 133001,
          error: "用户名（邮箱）或密码错误",
          data: null,
        });
      }
    });

    // 执行登出。
    app.post(`${baseHref}api/auth/logout`, (req, res) => {
      username = undefined;
      res.json({ code: 0 });
    });

    // 关联菜单。
    app.get(
      `${baseHref}api/gateway/micro_app.object_micro_app.GetObjectMicroAppList/api/micro_app/v1/object_micro_app`,
      (req, res) => {
        res.json({
          code: 0,
          data: {
            list: [],
          },
        });
      }
    );

    // 用户头像。
    app.get(
      `${baseHref}api/gateway/user_service.user_admin.GetUserInfoV2/api/v1/users/detail/:username`,
      (req, res) => {
        res.json({
          code: 0,
          data: {},
        });
      }
    );

    // Launchpad 收藏夹。
    app.get(
      `${baseHref}api/gateway/user_service.launchpad.ListCollection/api/v1/launchpad/collection`,
      (req, res) => {
        res.json({
          code: 0,
          data: {
            list: [],
          },
        });
      }
    );

    // 其它 API。
    app.all(`${baseHref}api/*`, (req, res) => {
      res.status(404).json({
        error: `404 Not Found: ${req.method} ${req.originalUrl}`,
      });
    });
  }
};
