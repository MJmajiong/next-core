declare module "*.module.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "*.css" {
  const css: string;
  export default css;
}

declare module "*.less" {
  const lessValue: string;
  export default lessValue;
}

interface SvgrComponent
  extends React.StatelessComponent<React.SVGAttributes<SVGElement>> {}

declare module "*.svg" {
  const svgValue: SvgrComponent;
  export default svgValue;
}

declare module "*.png" {
  const value: any;
  export = value;
}

interface Window {
  /** For Google Analytics. */
  dataLayer?: IArguments[];

  /** A map of versions of core packages. */
  BRICK_NEXT_VERSIONS?: Record<string, string>;

  /** Declare supported features currently. */
  BRICK_NEXT_FEATURES?: string[];

  /** A map of dll name to file path. */
  DLL_PATH?: Record<string, string>;

  // Variables below are for standalone micro-apps only.

  /** Markup for standalone micro-apps. */
  STANDALONE_MICRO_APPS?: boolean;

  /** The app needs no auth guard.  */
  NO_AUTH_GUARD?: boolean;

  /** The app root, E.g. "hello-world/" */
  APP_ROOT?: string;

  /** The public root, E.g. "hello-world/-/" */
  PUBLIC_ROOT?: string;

  /** The core root, E.g. "hello-world/-/core/" */
  CORE_ROOT?: string;

  /** The bootstrap filename, E.g. "hello-world/-/bootstrap.abc123.json" */
  BOOTSTRAP_FILE?: string;
}

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};
