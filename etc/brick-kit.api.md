## API Report File for "@next-core/brick-kit"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

import { Action } from 'history';
import { AppBarBrick } from '@next-core/brick-types';
import { AuthInfo } from '@next-core/brick-types';
import { BreadcrumbItemConf } from '@next-core/brick-types';
import { BrickConf } from '@next-core/brick-types';
import { BrickEventHandlerCallback } from '@next-core/brick-types';
import { BrickLifeCycle } from '@next-core/brick-types';
import { BrickPackage } from '@next-core/brick-types';
import { BrickTemplateFactory } from '@next-core/brick-types';
import { CustomApiInfo } from '@next-core/brick-utils';
import { CustomTemplateConstructor } from '@next-core/brick-types';
import { CustomTemplateProxy } from '@next-core/brick-types';
import { CustomTemplateProxyMergeableProperty } from '@next-core/brick-types';
import { CustomTemplateProxyMergeablePropertyOfArray } from '@next-core/brick-types';
import { CustomTemplateProxyMergeablePropertyOfObject } from '@next-core/brick-types';
import { CustomTemplateProxyRefProperty } from '@next-core/brick-types';
import { DefineResolveConf } from '@next-core/brick-types';
import { DesktopData } from '@next-core/brick-types';
import { EstreeNode } from '@next-core/brick-utils';
import { FeatureFlags } from '@next-core/brick-types';
import { GeneralTransform } from '@next-core/brick-types';
import { HttpFetchError } from '@next-core/brick-http';
import { HttpParseError } from '@next-core/brick-http';
import { HttpResponseError } from '@next-core/brick-http';
import { I18nData } from '@next-core/brick-types';
import { IllustrationProps } from '@next-core/illustrations';
import { InterceptorParams } from '@next-core/brick-types';
import { LayoutType } from '@next-core/brick-types';
import { Location as Location_2 } from 'history';
import { MagicBrickConfig } from '@next-core/brick-types';
import { MatchResult } from '@next-core/brick-types';
import { MenuBarBrick } from '@next-core/brick-types';
import { MenuRawData } from '@next-core/brick-types';
import { MessageConf } from '@next-core/brick-types';
import { MetaI18n } from '@next-core/brick-types';
import { MicroApp } from '@next-core/brick-types';
import { MicroAppModels } from '@next-sdk/micro-app-sdk';
import { ModalFunc } from 'antd/lib/modal/confirm';
import { MountPoints } from '@next-core/brick-types';
import { PluginHistory } from '@next-core/brick-types';
import { PluginHistoryState } from '@next-core/brick-types';
import { PluginLocation } from '@next-core/brick-types';
import { PluginRuntimeContext } from '@next-core/brick-types';
import { PresetBricksConf } from '@next-core/brick-types';
import { default as React_2 } from 'react';
import { RefForProxy } from '@next-core/brick-types';
import { ResolveConf } from '@next-core/brick-types';
import { RouteConf } from '@next-core/brick-types';
import { RuntimeBootstrapData } from '@next-core/brick-types';
import { RuntimeStoryboard } from '@next-core/brick-types';
import { SidebarMenu } from '@next-core/brick-types';
import { SidebarSubMenu } from '@next-core/brick-types';
import { SimpleFunction } from '@next-core/brick-types';
import { SiteMapItem } from '@next-core/brick-types';
import { SiteMode } from '@next-core/brick-types';
import { SiteTheme } from '@next-core/brick-types';
import { Storyboard } from '@next-core/brick-types';
import { StoryboardFunction } from '@next-core/brick-types';
import { Subtract } from 'react-i18next';
import { TemplatePackage } from '@next-core/brick-types';
import { UseBrickConf } from '@next-core/brick-types';
import { UserInfo } from '@next-core/brick-types';
import { UseSingleBrickConf } from '@next-core/brick-types';
import { WithTranslation } from 'react-i18next';
import { WithTranslationProps } from 'react-i18next';

// @public
export interface AbstractRuntime {
    applyPageTitle(pageTitle: string): void;
    fetchMenu(menuId: string): Promise<SidebarMenu>;
    getBasePath(): string;
    getCurrentApp(): MicroApp;
    getCurrentMode(): SiteMode;
    getCurrentTheme(): SiteTheme;
    getFeatureFlags(): FeatureFlags;
    getMicroApps(options?: GetMicroAppsOptions): MicroApp[];
    getMiscSettings(): Record<string, unknown>;
    hasInstalledApp(appId: string, matchVersion?: string): boolean;
    // Warning: (ae-forgotten-export) The symbol "CustomProcessorFunc" needs to be exported by the entry point index.d.ts
    registerCustomProcessor(processorFullName: string, processorFunc: CustomProcessorFunc): void;
    registerCustomTemplate(tplName: string, tplConstructor: CustomTemplateConstructor, appId?: string): void;
    // Warning: (ae-forgotten-export) The symbol "LazyBrickImportFunction" needs to be exported by the entry point index.d.ts
    registerLazyBricks(bricks: string | string[], factory: LazyBrickImportFunction): void;
}

// Warning: (ae-internal-missing-underscore) The name "authenticate" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function authenticate(newAuth: AuthInfo): void;

// Warning: (ae-forgotten-export) The symbol "BrickAsComponentProps" needs to be exported by the entry point index.d.ts
//
// @public
export function BrickAsComponent({ useBrick, data, parentRefForUseBrickInPortal, }: BrickAsComponentProps): React_2.ReactElement;

// Warning: (ae-forgotten-export) The symbol "BrickWrapperProps" needs to be exported by the entry point index.d.ts
//
// @public
export function BrickWrapper(props: BrickWrapperProps): React_2.ReactElement;

// Warning: (ae-internal-missing-underscore) The name "checkIf" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal @deprecated (undocumented)
export function checkIf(rawIf: string | boolean, context: PluginRuntimeContext): boolean;

// Warning: (ae-internal-missing-underscore) The name "checkIfByTransform" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal @deprecated (undocumented)
export function checkIfByTransform(rawIf: string | boolean, data: unknown): boolean;

// Warning: (ae-internal-missing-underscore) The name "createHistory" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function createHistory(): PluginHistory;

// Warning: (ae-forgotten-export) The symbol "Runtime" needs to be exported by the entry point index.d.ts
// Warning: (ae-internal-missing-underscore) The name "createRuntime" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function createRuntime(): Runtime;

// Warning: (ae-internal-missing-underscore) The name "CustomApiDefinition" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface CustomApiDefinition {
    // (undocumented)
    contract?: {
        endpoint: {
            uri: string;
            method: "POST" | "post" | "PUT" | "put" | "GET" | "get" | "DELETE" | "delete" | "LIST" | "list" | "PATCH" | "patch" | "HEAD" | "head";
        };
        response?: {
            wrapper?: boolean;
            type?: "file" | "object";
        };
    };
    // (undocumented)
    name: string;
    // (undocumented)
    namespace: string;
    // (undocumented)
    version?: string;
}

// Warning: (ae-internal-missing-underscore) The name "CustomApiProfile" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface CustomApiProfile {
    // (undocumented)
    isFileType?: boolean;
    // (undocumented)
    method: string;
    // (undocumented)
    name: string;
    // (undocumented)
    namespace: string;
    // (undocumented)
    responseWrapper: boolean;
    // (undocumented)
    uri: string;
    // (undocumented)
    version?: string;
}

// Warning: (ae-internal-missing-underscore) The name "developHelper" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export const developHelper: {
    asyncProcessBrick(brickConf: BrickConf): Promise<void>;
    LocationContext: typeof LocationContext;
    mountTree: typeof mountTree;
    unmountTree: typeof unmountTree;
    afterMountTree: typeof afterMountTree;
    getBrickPackages: typeof _dev_only_getBrickPackages;
    getTemplatePackages: typeof _dev_only_getTemplatePackages;
    getStoryboards: typeof _dev_only_getStoryboards;
    loadEditorBricks: typeof _dev_only_loadEditorBricks;
    loadDynamicBricksInBrickConf: typeof _dev_only_loadDynamicBricksInBrickConf;
    getFakeKernel: typeof _dev_only_getFakeKernel;
    checkoutTplContext: typeof _dev_only_checkoutTplContext;
};

// Warning: (ae-forgotten-export) The symbol "featureFlagsProps" needs to be exported by the entry point index.d.ts
//
// @public
export function DisplayByFeatureFlags(props: React_2.PropsWithChildren<featureFlagsProps>): React_2.ReactElement;

// Warning: (ae-forgotten-export) The symbol "DoTransformOptions" needs to be exported by the entry point index.d.ts
// Warning: (ae-internal-missing-underscore) The name "doTransform" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function doTransform(data: unknown, to: unknown, options?: DoTransformOptions): unknown;

// @public
export function EasyopsEmpty(props: EasyopsEmptyProps): React_2.ReactElement;

// @public (undocumented)
export interface EasyopsEmptyProps {
    // (undocumented)
    background?: string;
    // (undocumented)
    description?: string | React_2.ReactNode;
    // (undocumented)
    illustration?: IllustrationProps;
    // (undocumented)
    imageStyle?: React_2.CSSProperties;
}

// Warning: (ae-forgotten-export) The symbol "NS_BRICK_KIT" needs to be exported by the entry point index.d.ts
// Warning: (ae-internal-missing-underscore) The name "ErrorBoundary" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export const ErrorBoundary: React_2.ComponentType<Omit<Subtract<WithTranslation<typeof NS_BRICK_KIT>, WithTranslationProps>, keyof WithTranslation<typeof NS_BRICK_KIT>> & WithTranslationProps>;

// @public
function event_2(options: EventDeclaration): any;

export { event_2 as event }

// @public
export interface EventDeclaration extends EventInit {
    type: string;
}

// @public
export interface EventEmitter<T = unknown> {
    emit: (detail?: T) => boolean;
}

// @public (undocumented)
export const FeatureFlagsProvider: React_2.Provider<FeatureFlags>;

// Warning: (ae-forgotten-export) The symbol "SingleBrickAsComponentProps" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export const ForwardRefSingleBrickAsComponent: React_2.MemoExoticComponent<React_2.ForwardRefExoticComponent<SingleBrickAsComponentProps & React_2.RefAttributes<HTMLElement>>>;

// Warning: (ae-internal-missing-underscore) The name "FunctionCoverageCollector" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface FunctionCoverageCollector {
    // (undocumented)
    beforeBranch(node: EstreeNode, branch: string): void;
    // (undocumented)
    beforeCall(node: EstreeNode): void;
    // (undocumented)
    beforeEvaluate(node: EstreeNode): void;
    // (undocumented)
    beforeVisit(node: EstreeNode): void;
}

// Warning: (ae-internal-missing-underscore) The name "FunctionCoverageSettings" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface FunctionCoverageSettings {
    // (undocumented)
    createCollector(name: string): FunctionCoverageCollector;
}

// @public
export function getAuth(): AuthInfo;

// @public
export function getHistory(): PluginHistory;

// @public
export interface GetMicroAppsOptions {
    excludeInstalling?: boolean;
    includeInternal?: boolean;
}

// @public
export function getRuntime(): Runtime;

// @public
export function handleHttpError(error: Error | HttpFetchError | HttpResponseError | HttpParseError): ReturnType<ModalFunc>;

// @public
export function httpErrorToString(error: Error | HttpFetchError | HttpResponseError | HttpParseError | Event): string;

// @public (undocumented)
export function i18nText(data: I18nData): string;

// @public
export interface IfContainer {
    if?: unknown;
}

// Warning: (ae-internal-missing-underscore) The name "initI18n" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export const initI18n: () => void;

// @public
export function isLoggedIn(): boolean;

// Warning: (ae-internal-missing-underscore) The name "logout" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function logout(): void;

// Warning: (ae-internal-missing-underscore) The name "looseCheckIf" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function looseCheckIf(ifContainer: IfContainer, context: PluginRuntimeContext): boolean;

// @public
export function looseCheckIfByTransform(ifContainer: IfContainer, data: unknown, options?: {
    allowInject?: boolean;
    getTplVariables?: () => Record<string, unknown>;
}): boolean;

// Warning: (ae-internal-missing-underscore) The name "looseCheckIfOfComputed" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function looseCheckIfOfComputed(ifContainer: IfContainer): boolean;

// @public
export function method(): any;

// @public
export abstract class ModalElement extends UpdatingElement {
    closeModal: () => void;
    isVisible: boolean;
    openModal: (e?: CustomEvent) => void;
}

// Warning: (ae-internal-missing-underscore) The name "PartialMicroApp" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export type PartialMicroApp = Pick<MicroApp, "id" | "isBuildPush">;

// Warning: (ae-forgotten-export) The symbol "TransformOptions" needs to be exported by the entry point index.d.ts
// Warning: (ae-internal-missing-underscore) The name "preprocessTransformProperties" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function preprocessTransformProperties(data: unknown, to: GeneralTransform, from?: string | string[], mapArray?: boolean | "auto", options?: TransformOptions): Record<string, unknown>;

// @public
export function property(options?: PropertyDeclaration): any;

// @public
export interface PropertyDeclaration<Type = unknown> {
    // @internal
    readonly __deprecated_and_for_compatibility_only?: boolean;
    // @internal
    readonly __unstable_doNotDecorate?: boolean;
    readonly attribute?: boolean | string;
    // Warning: (ae-forgotten-export) The symbol "ComplexAttributeConverter" needs to be exported by the entry point index.d.ts
    readonly converter?: ComplexAttributeConverter<Type>;
    hasChanged?(value: Type, oldValue: Type): boolean;
    readonly noAccessor?: boolean;
    readonly reflect?: boolean;
    // Warning: (ae-forgotten-export) The symbol "TypeHint" needs to be exported by the entry point index.d.ts
    readonly type?: TypeHint;
}

// Warning: (ae-internal-missing-underscore) The name "ReadonlyStoryboardFunctions" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export type ReadonlyStoryboardFunctions = Readonly<Record<string, SimpleFunction>>;

// Warning: (ae-internal-missing-underscore) The name "RecentApps" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface RecentApps {
    // (undocumented)
    currentApp?: MicroApp;
    // (undocumented)
    previousApp?: MicroApp;
    // (undocumented)
    previousWorkspace?: VisitedWorkspace;
}

// Warning: (ae-internal-missing-underscore) The name "RedirectConf" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface RedirectConf {
    // (undocumented)
    redirect?: string;
}

// Warning: (ae-internal-missing-underscore) The name "RelatedApp" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export type RelatedApp = MicroAppModels.ModelObjectMicroApp;

// @public
export function renderEasyopsEmpty(): React_2.ReactNode;

// Warning: (ae-internal-missing-underscore) The name "reTransformForDevtools" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function reTransformForDevtools(transformationId: number, data: unknown, to: GeneralTransform, from?: string | string[], mapArray?: boolean | "auto", allowInject?: boolean): void;

// Warning: (ae-internal-missing-underscore) The name "RouterState" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export type RouterState = "initial" | "ready-to-mount" | "mounted";

// Warning: (ae-internal-missing-underscore) The name "RuntimeStoryboardFunction" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface RuntimeStoryboardFunction {
    // (undocumented)
    cooked?: SimpleFunction;
    // (undocumented)
    processed?: boolean;
    // (undocumented)
    source: string;
    // (undocumented)
    typescript?: boolean;
}

// @public
export const SingleBrickAsComponent: React_2.NamedExoticComponent<SingleBrickAsComponentProps>;

// Warning: (ae-internal-missing-underscore) The name "StoryboardFunctionPatch" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export type StoryboardFunctionPatch = Pick<StoryboardFunction, "source" | "typescript">;

// Warning: (ae-internal-missing-underscore) The name "StoryboardFunctionRegistry" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface StoryboardFunctionRegistry {
    registerStoryboardFunctions(functions: StoryboardFunction[], app?: PartialMicroApp): void;
    storyboardFunctions: ReadonlyStoryboardFunctions;
    updateStoryboardFunction(name: string, data: StoryboardFunctionPatch): void;
}

// Warning: (ae-internal-missing-underscore) The name "StoryboardFunctionRegistryFactory" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function StoryboardFunctionRegistryFactory({ widgetId, collectCoverage, }?: {
    widgetId?: string;
    collectCoverage?: FunctionCoverageSettings;
}): StoryboardFunctionRegistry;

// Warning: (ae-internal-missing-underscore) The name "transformElementProperties" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function transformElementProperties(element: HTMLElement, data: unknown, to: GeneralTransform, from?: string | string[], mapArray?: boolean | "auto"): void;

// Warning: (ae-internal-missing-underscore) The name "transformIntermediateData" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function transformIntermediateData(data: unknown, to: GeneralTransform, from?: string | string[], mapArray?: boolean | "auto"): unknown;

// Warning: (ae-internal-missing-underscore) The name "transformProperties" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function transformProperties(props: Record<string, unknown>, data: unknown, to: GeneralTransform, from?: string | string[], mapArray?: boolean | "auto", options?: {
    allowInject?: boolean;
}): Record<string, unknown>;

// @public
export abstract class UpdatingElement extends HTMLElement {
    // @internal (undocumented)
    get $$typeof(): string;
    // @internal (undocumented)
    attributeChangedCallback(name: string, old: string | null, value: string | null): void;
    // @internal (undocumented)
    static createEventEmitter(name: string, options: EventDeclaration): void;
    // @internal (undocumented)
    static createMethod(name: string): void;
    // @internal (undocumented)
    static createProperty(name: string, options?: PropertyDeclaration): void;
    // @internal (undocumented)
    static get _dev_only_definedEvents(): string[];
    // @internal (undocumented)
    static get _dev_only_definedMethods(): string[];
    // @internal (undocumented)
    static get _dev_only_definedProperties(): string[];
    // @internal (undocumented)
    static get observedAttributes(): string[];
    protected abstract _render(): void;
}

// @public
export function useApplyPageTitle(pageTitle: string): void;

// @public
export function useCurrentApp(): MicroApp;

// @public (undocumented)
export function useCurrentMode(): SiteMode;

// @public (undocumented)
export function useCurrentTheme(): SiteTheme;

// @public
export function useFeatureFlags(name?: string | string[]): boolean[] | string[];

// Warning: (ae-internal-missing-underscore) The name "useLocation" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function useLocation(): Location_2<PluginHistoryState>;

// Warning: (ae-internal-missing-underscore) The name "useRecentApps" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export function useRecentApps(): RecentApps;

// Warning: (ae-internal-missing-underscore) The name "VisitedWorkspace" should be prefixed with an underscore because the declaration is marked as @internal
//
// @internal (undocumented)
export interface VisitedWorkspace {
    // (undocumented)
    appId: string;
    // (undocumented)
    appLocaleName: string;
    // (undocumented)
    appName: string;
    // (undocumented)
    url: string;
}


// Warnings were encountered during analysis:
//
// src/developHelper.ts:21:3 - (ae-forgotten-export) The symbol "LocationContext" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:22:3 - (ae-forgotten-export) The symbol "mountTree" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:23:3 - (ae-forgotten-export) The symbol "unmountTree" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:24:3 - (ae-forgotten-export) The symbol "afterMountTree" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:25:3 - (ae-forgotten-export) The symbol "_dev_only_getBrickPackages" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:26:3 - (ae-forgotten-export) The symbol "_dev_only_getTemplatePackages" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:27:3 - (ae-forgotten-export) The symbol "_dev_only_getStoryboards" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:28:3 - (ae-forgotten-export) The symbol "_dev_only_loadEditorBricks" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:29:3 - (ae-forgotten-export) The symbol "_dev_only_loadDynamicBricksInBrickConf" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:30:3 - (ae-forgotten-export) The symbol "_dev_only_getFakeKernel" needs to be exported by the entry point index.d.ts
// src/developHelper.ts:31:3 - (ae-forgotten-export) The symbol "_dev_only_checkoutTplContext" needs to be exported by the entry point index.d.ts

```
