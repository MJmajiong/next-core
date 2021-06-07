import { Storyboard, BrickPackage } from "@next-core/brick-types";
import {
  scanBricksInStoryboard,
  ScanBricksOptions,
} from "./scanBricksInStoryboard";
import { scanProcessorsInStoryboard } from "./scanProcessorsInStoryboard";

interface DllAndDeps {
  dll: string[];
  deps: string[];
}

export function getDllAndDepsOfStoryboard(
  storyboard: Storyboard,
  brickPackages: BrickPackage[],
  options?: ScanBricksOptions
): DllAndDeps {
  return getDllAndDepsByResource(
    {
      bricks: scanBricksInStoryboard(storyboard, options),
      processors: scanProcessorsInStoryboard(storyboard),
    },
    brickPackages
  );
}

export function getDllAndDepsOfBricks(
  bricks: string[],
  brickPackages: BrickPackage[]
): DllAndDeps {
  const dll = new Set<string>();
  const deps: string[] = [];
  if (bricks.length > 0) {
    const brickSet = new Set(bricks);
    brickPackages.forEach((pkg) => {
      if (pkg.bricks.some((brick) => brickSet.has(brick))) {
        if (pkg.dll) {
          for (const dllName of pkg.dll) {
            dll.add(dllName);
          }
        }
        deps.push(pkg.filePath);
      }
    });
  }
  const dllPath: Record<string, string> = (window as any)["DLL_PATH"];
  return {
    dll: Array.from(dll).map((dllName) => dllPath[dllName]),
    deps,
  };
}

interface StoryboardResource {
  bricks?: string[];
  processors?: string[];
  editorBricks?: string[];
  previewBricks?: string[];
}

export function getDllAndDepsByResource(
  { bricks, processors, editorBricks, previewBricks }: StoryboardResource,
  brickPackages: BrickPackage[]
): DllAndDeps {
  const dll = new Set<string>();
  const deps: string[] = [];
  if (
    bricks?.length > 0 ||
    processors?.length > 0 ||
    editorBricks?.length > 0 ||
    previewBricks?.length > 0
  ) {
    const brickSet = new Set(bricks || []);
    const processorSet = new Set(processors || []);
    const editorBrickSet = new Set(editorBricks || []);
    const previewBrickSet = new Set(previewBricks || []);
    brickPackages.forEach((pkg) => {
      const hasBricks = pkg.bricks.some((brick) => brickSet.has(brick));
      const hasProcessors = pkg.processors?.some((item) =>
        processorSet.has(item)
      );
      const hasEditorBricks = pkg.editors?.some((item) =>
        editorBrickSet.has(item)
      );
      const hasPreviewBricks = pkg.previews?.some((item) =>
        previewBrickSet.has(item)
      );
      if (hasBricks || hasProcessors) {
        if (pkg.dll) {
          for (const dllName of pkg.dll) {
            dll.add(dllName);
          }
        }
        deps.push(pkg.filePath);
      }
      if (hasEditorBricks) {
        // Editor bricks have a constant dll of `@next-dll/editor-bricks-helper`.
        dll.add("editor-bricks-helper");
        deps.push(pkg.editorsJsFilePath);
      }
      if (hasPreviewBricks) {
        deps.push(pkg.previewsJsFilePath);
      }
    });
  }
  const dllPath: Record<string, string> = (window as any)["DLL_PATH"];
  return {
    dll: Array.from(dll).map((dllName) => dllPath[dllName]),
    deps,
  };
}
