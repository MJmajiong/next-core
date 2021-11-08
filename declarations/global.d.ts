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
  dataLayer?: IArguments[];
  DLL_PATH?: Record<string, string>;
  STANDALONE_MICRO_APPS?: boolean;
  NO_AUTH_GUARD?: boolean;
  BOOTSTRAP_PATH?: string;
  PUBLIC_ROOT?: string;
  CORE_ROOT?: string;
  BRICK_NEXT_VERSIONS?: Record<string, string>;
  BRICK_NEXT_FEATURES?: string[];
}
