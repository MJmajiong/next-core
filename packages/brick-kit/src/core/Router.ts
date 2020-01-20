import { locationsAreEqual, createPath } from "history";
import { PluginLocation } from "@easyops/brick-types";
import {
  loadScript,
  getTemplateDepsOfStoryboard,
  getDllAndDepsOfStoryboard,
  asyncProcessStoryboard,
  restoreDynamicTemplates
} from "@easyops/brick-utils";
import {
  LocationContext,
  mountTree,
  mountStaticNode,
  Kernel,
  MountableElement,
  unmountTree,
  MountRoutesResult,
  appendBrick
} from "./exports";
import { getHistory } from "../history";
import { httpErrorToString, handleHttpError } from "../handleHttpError";
import { isUnauthenticatedError } from "../isUnauthenticatedError";
import { brickTemplateRegistry } from "./TemplateRegistries";
import { RecentApps } from "./interfaces";

export class Router {
  private defaultCollapsed = false;
  private locationContext: LocationContext;
  private rendering = false;
  private nextLocation: PluginLocation;
  private prevLocation: PluginLocation;

  constructor(private kernel: Kernel) {}

  async bootstrap(): Promise<void> {
    const history = getHistory();
    this.prevLocation = history.location;
    history.listen(async (location: PluginLocation) => {
      let ignoreRendering = false;
      const omittedLocationProps: Partial<PluginLocation> = {
        hash: null
      };
      // If the new location is triggered by browser pop state, the `key` is undefined.
      // Then we omit the "key" when checking whether locations are equal.
      if (location.key === undefined) {
        omittedLocationProps.key = null;
      }
      if (
        locationsAreEqual(
          { ...this.prevLocation, ...omittedLocationProps },
          { ...location, ...omittedLocationProps }
        ) ||
        (location.state && location.state.notify === false)
      ) {
        // Ignore rendering if location not changed except hash and key.
        // Ignore rendering if notify is `false`.
        ignoreRendering = true;
      }
      this.prevLocation = location;
      if (ignoreRendering) {
        return;
      }
      if (this.rendering) {
        this.nextLocation = location;
      } else {
        try {
          await this.queuedRender(location);
        } catch (e) {
          handleHttpError(e);
        }
      }
    });
    await this.queuedRender(history.location);
    this.kernel.firstRendered();
  }

  private async queuedRender(location: PluginLocation): Promise<void> {
    this.rendering = true;
    try {
      await this.render(location);
    } finally {
      this.rendering = false;
      if (this.nextLocation) {
        const nextLocation = this.nextLocation;
        this.nextLocation = null;
        await this.queuedRender(nextLocation);
      }
    }
  }

  private async render(location: PluginLocation): Promise<void> {
    if (this.locationContext) {
      this.locationContext.resolver.resetRefreshQueue();
    }

    const history = getHistory();
    const locationContext = (this.locationContext = new LocationContext(
      this.kernel,
      location
    ));
    const { bootstrapData } = this.kernel;
    const storyboard = locationContext.matchStoryboard(
      bootstrapData.storyboards
    );

    if (storyboard) {
      // 将动态解析后的模板还原，以便重新动态解析。
      restoreDynamicTemplates(storyboard);

      // 如果找到匹配的 storyboard，那么加载它的依赖库。
      if (storyboard.dependsAll) {
        const dllHash: Record<string, string> = (window as any).DLL_HASH || {};
        await loadScript(
          Object.entries(dllHash).map(
            ([name, hash]) => `dll-of-${name}.js?${hash}`
          )
        );
        await loadScript(
          bootstrapData.brickPackages
            .map(item => item.filePath)
            .concat(bootstrapData.templatePackages.map(item => item.filePath))
        );
      } else if (!storyboard.$$depsProcessed) {
        // 先加载模板
        const templateDeps = getTemplateDepsOfStoryboard(
          storyboard,
          bootstrapData.templatePackages
        );
        await loadScript(templateDeps);
        // 加载模板后才能加工得到最终的构件表
        const result = getDllAndDepsOfStoryboard(
          await asyncProcessStoryboard(
            storyboard,
            brickTemplateRegistry,
            bootstrapData.templatePackages
          ),
          bootstrapData.brickPackages
        );
        await loadScript(result.dll);
        await loadScript(result.deps);
        // 每个 storyboard 仅处理一次依赖
        storyboard.$$depsProcessed = true;
      }
    }

    const { mountPoints, currentApp: previousApp } = this.kernel;
    const currentApp = storyboard ? storyboard.app : undefined;
    // Storyboard maybe re-assigned, e.g. when open launchpad.
    const appChanged =
      previousApp && currentApp
        ? previousApp.id !== currentApp.id
        : previousApp !== currentApp;
    const legacy = currentApp ? currentApp.legacy : undefined;
    this.kernel.nextApp = currentApp;

    unmountTree(mountPoints.bg as MountableElement);

    if (storyboard) {
      const mountRoutesResult: MountRoutesResult = {
        main: [],
        menuInBg: [],
        menuBar: {
          app: this.kernel.nextApp
        },
        appBar: {
          app: this.kernel.nextApp,
          breadcrumb: []
        },
        redirect: undefined,
        hybrid: false,
        failed: false
      };
      try {
        await locationContext.mountRoutes(
          storyboard.routes,
          undefined,
          mountRoutesResult
        );
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);

        // Redirect to login page if not logged in.
        if (isUnauthenticatedError(error)) {
          const history = getHistory();
          history.push("/auth/login", {
            from: location
          });
          return;
        }

        mountRoutesResult.failed = true;
        mountRoutesResult.main = [
          {
            type: "basic-bricks.page-error",
            properties: {
              error: httpErrorToString(error)
            },
            events: {}
          }
        ];
      }

      const {
        redirect,
        main,
        menuInBg,
        menuBar,
        appBar,
        barsHidden,
        hybrid,
        failed
      } = mountRoutesResult;

      if (redirect) {
        history.replace(redirect.path, redirect.state);
        return;
      }

      if (appChanged) {
        this.kernel.currentApp = currentApp;
      }
      this.kernel.currentUrl = createPath(location);
      this.kernel.updateWorkspaceStack();

      if (appChanged) {
        window.dispatchEvent(
          new CustomEvent<RecentApps>("app.change", {
            detail: {
              previousApp,
              currentApp,
              previousWorkspace: this.kernel.getPreviousWorkspace()
            }
          })
        );
      }

      const actualLegacy =
        (legacy === "iframe" && !hybrid) || (legacy !== "iframe" && hybrid)
          ? "iframe"
          : undefined;
      this.kernel.unsetBars({ appChanged, legacy: actualLegacy });

      if (barsHidden) {
        this.kernel.toggleBars(false);
      } else {
        if (menuBar.menu && menuBar.menu.defaultCollapsed) {
          this.kernel.menuBar.collapse(true);
          this.defaultCollapsed = true;
        } else {
          if (this.defaultCollapsed) {
            this.kernel.menuBar.collapse(false);
          }
          this.defaultCollapsed = false;
        }
        if (actualLegacy === "iframe") {
          // Do not modify breadcrumb in iframe mode,
          // it will be *popped* from iframe automatically.
          delete appBar.breadcrumb;
        }
        mountStaticNode(this.kernel.menuBar.element, menuBar);
        mountStaticNode(this.kernel.appBar.element, appBar);
      }

      this.kernel.toggleLegacyIframe(actualLegacy === "iframe");

      menuInBg.forEach(brick => {
        appendBrick(brick, mountPoints.bg as MountableElement);
      });

      if (main.length > 0) {
        mountTree(main, mountPoints.main as MountableElement);
        if (!failed) {
          this.locationContext.handlePageLoad();
          this.locationContext.resolver.scheduleRefreshing();
        }
        return;
      }
    }

    mountTree(
      [
        {
          type: "basic-bricks.page-not-found",
          properties: {
            url: history.createHref(location)
          },
          events: {}
        }
      ],
      mountPoints.main as MountableElement
    );
  }
}
