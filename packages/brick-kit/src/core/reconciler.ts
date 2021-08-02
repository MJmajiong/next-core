import { setRealProperties } from "../internal/setProperties";
import { RuntimeBrick, BrickNode } from "./exports";

export interface MountableElement extends HTMLElement {
  $$rootBricks: BrickNode[];
}

export function unmountTree(mountPoint: MountableElement): void {
  if (Array.isArray(mountPoint.$$rootBricks)) {
    mountPoint.$$rootBricks.forEach((brick) => {
      brick.unmount();
    });
    mountPoint.$$rootBricks = [];
  }
  mountPoint.innerHTML = "";
}

// Todo(steve): reconcile.
export function mountTree(
  bricks: RuntimeBrick[],
  mountPoint: MountableElement
): void {
  // Destroy any existing tree
  if (mountPoint.firstChild) {
    unmountTree(mountPoint);
  }

  // Create the top-level internal instance
  const rootBricks = bricks.map((brick) => new BrickNode(brick));

  // Mount the top-level component into the container
  const nodes = rootBricks.map((brick) => brick.mount());
  nodes.forEach((node) => mountPoint.appendChild(node));

  // Save a reference to the internal instance
  mountPoint.$$rootBricks = rootBricks;
}

export function afterMountTree(mountPoint: MountableElement): void {
  if (Array.isArray(mountPoint.$$rootBricks)) {
    mountPoint.$$rootBricks.forEach((brick) => {
      brick.afterMount();
    });
  }
}

export function mountStaticNode(
  mountPoint: HTMLElement,
  properties: Record<string, any>
): void {
  setRealProperties(mountPoint, properties);
}

export function appendBrick(
  brick: RuntimeBrick,
  mountPoint: MountableElement
): void {
  const brickNode = new BrickNode(brick);
  mountPoint.appendChild(brickNode.mount());
  if (!mountPoint.$$rootBricks) {
    mountPoint.$$rootBricks = [];
  }
  mountPoint.$$rootBricks.push(brickNode);
}
