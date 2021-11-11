import { get, cloneDeep } from "lodash";
import {
  Storyboard,
  RouteConf,
  RuntimeBrickConf,
  BrickTemplateFactory,
  TemplateRegistry,
  TemplatePackage,
  RouteConfOfBricks,
} from "@next-core/brick-types";
import { loadScript } from "./loadScript";
import { getDepsOfTemplates } from "./getTemplateDepsOfStoryboard";
import { hasOwnProperty } from "./hasOwnProperty";

export async function asyncProcessBrick(
  brickConf: RuntimeBrickConf,
  templateRegistry: TemplateRegistry<BrickTemplateFactory>,
  templatePackages: TemplatePackage[]
): Promise<void> {
  if (brickConf.template) {
    if (
      !brickConf.$$resolved &&
      get(brickConf, ["lifeCycle", "useResolves"], []).length > 0
    ) {
      // Leave these dynamic templates to `LocationContext::resolve()`.
      // Remember original params, since it maybe changed when resolving.
      brickConf.$$params = cloneDeep(brickConf.params);
    } else {
      let updatedBrickConf: Partial<RuntimeBrickConf> = brickConf;
      const processedTemplates: string[] = [];
      // If a template returns a template, keep on loading template,
      // until finally it returns a brick.
      while (updatedBrickConf.template) {
        // Forbid recursive templates.
        if (processedTemplates.includes(updatedBrickConf.template)) {
          throw new Error(
            `Recursive template found: ${updatedBrickConf.template}`
          );
        }
        processedTemplates.push(updatedBrickConf.template);

        if (!templateRegistry.has(updatedBrickConf.template)) {
          await loadScript(
            getDepsOfTemplates([updatedBrickConf.template], templatePackages),
            window.PUBLIC_ROOT
          );
        }
        if (templateRegistry.has(updatedBrickConf.template)) {
          updatedBrickConf = templateRegistry.get(updatedBrickConf.template)(
            updatedBrickConf.params
          );
        } else {
          updatedBrickConf = {
            brick: "basic-bricks.page-error",
            properties: {
              error: `Template not found: ${brickConf.template}`,
            },
          };
        }
      }
      // Cleanup brickConf and remember original data for restore.
      const { template, lifeCycle, $$params, params } = brickConf;
      const hasIf = hasOwnProperty(brickConf, "if");
      const rawIf = brickConf.if;
      Object.keys(brickConf).forEach((key) => {
        delete brickConf[key as keyof RuntimeBrickConf];
      });
      Object.assign(
        brickConf,
        updatedBrickConf,
        {
          $$template: template,
          $$params: $$params || cloneDeep(params),
          $$lifeCycle: lifeCycle,
        },
        hasIf ? { $$if: rawIf } : {}
      );
    }
  }
  if (brickConf.slots) {
    await Promise.all(
      Object.values(brickConf.slots).map(async (slotConf) => {
        if (slotConf.type === "bricks") {
          await asyncProcessBricks(
            slotConf.bricks,
            templateRegistry,
            templatePackages
          );
        } else {
          await asyncProcessRoutes(
            slotConf.routes,
            templateRegistry,
            templatePackages
          );
        }
      })
    );
  }
}

async function asyncProcessBricks(
  bricks: RuntimeBrickConf[],
  templateRegistry: TemplateRegistry<BrickTemplateFactory>,
  templatePackages: TemplatePackage[]
): Promise<void> {
  if (Array.isArray(bricks)) {
    await Promise.all(
      bricks.map(async (brickConf) => {
        await asyncProcessBrick(brickConf, templateRegistry, templatePackages);
      })
    );
  }
}

async function asyncProcessRoutes(
  routes: RouteConf[],
  templateRegistry: TemplateRegistry<BrickTemplateFactory>,
  templatePackages: TemplatePackage[]
): Promise<void> {
  if (Array.isArray(routes)) {
    await Promise.all(
      routes.map(async (routeConf) => {
        if (routeConf.type === "routes") {
          await asyncProcessRoutes(
            routeConf.routes,
            templateRegistry,
            templatePackages
          );
        } else {
          await asyncProcessBricks(
            (routeConf as RouteConfOfBricks).bricks,
            templateRegistry,
            templatePackages
          );
        }
        const menuBrickConf = routeConf.menu;
        if (menuBrickConf && menuBrickConf.type === "brick") {
          await asyncProcessBrick(
            menuBrickConf,
            templateRegistry,
            templatePackages
          );
        }
      })
    );
  }
}

export async function asyncProcessStoryboard(
  storyboard: Storyboard,
  templateRegistry: TemplateRegistry<BrickTemplateFactory>,
  templatePackages: TemplatePackage[]
): Promise<Storyboard> {
  await asyncProcessRoutes(
    storyboard.routes,
    templateRegistry,
    templatePackages
  );
  return storyboard;
}
