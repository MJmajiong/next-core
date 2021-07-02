import { message } from "antd";
import { isObject } from "@next-core/brick-utils";
import {
  BrickEventHandler,
  BrickEventHandlerCallback,
  BrickEventsMap,
  BuiltinBrickEventHandler,
  CustomBrickEventHandler,
  PluginRuntimeContext,
  ExecuteCustomBrickEventHandler,
  SetPropsCustomBrickEventHandler,
  RuntimeBrickElement,
  StoryboardContextItem,
  UseProviderEventHandler,
} from "@next-core/brick-types";
import { handleHttpError, httpErrorToString } from "./handleHttpError";
import { computeRealValue, setProperties } from "./setProperties";
import { getHistory } from "./history";
import {
  _internalApiGetCurrentContext,
  _internalApiGetProviderBrick,
  symbolForParentTemplate,
  RuntimeBrickElementWithTplSymbols,
  _internalApiGetMicroAppApiOrchestrationMap,
  symbolForParentRefForUseBrickInPortal,
} from "./core/exports";
import { getUrlBySegueFactory } from "./segue";
import { looseCheckIf, IfContainer } from "./checkIf";
import { getUrlByAliasFactory } from "./alias";
import { getMessageDispatcher } from "./core/MessageDispatcher";
import { PluginWebSocketMessageTopic } from "./websocket/interfaces";
import { isCustomApiProvider, getArgsOfCustomApi } from "./core/CustomApis";
import { applyTheme, applyMode } from "./themeAndMode";
import { clearMenuTitleCache, clearMenuCache } from "./core/menu";

export function bindListeners(
  brick: HTMLElement,
  eventsMap: BrickEventsMap,
  context?: PluginRuntimeContext
): void {
  Object.entries(eventsMap).forEach(([eventType, handlers]) => {
    [].concat(handlers).forEach((handler: BrickEventHandler) => {
      const listener = listenerFactory(handler, context, brick);
      brick.addEventListener(eventType, listener);
      rememberListeners(brick, eventType, listener, handler);
    });
  });
}

export function unbindListeners(brick: HTMLElement): void {
  if ((brick as RuntimeBrickElement).$$eventListeners) {
    for (const [eventType, listener] of (brick as RuntimeBrickElement)
      .$$eventListeners) {
      brick.removeEventListener(eventType, listener);
    }
    (brick as RuntimeBrickElement).$$eventListeners = [];
  }
}

function rememberListeners(
  brick: RuntimeBrickElement,
  eventType: string,
  listener: EventListener,
  handler: BrickEventHandler
): void {
  if (!brick.$$eventListeners) {
    brick.$$eventListeners = [];
  }
  brick.$$eventListeners.push([eventType, listener, handler]);
}

export function isBuiltinHandler(
  handler: BrickEventHandler
): handler is BuiltinBrickEventHandler {
  return typeof (handler as BuiltinBrickEventHandler).action === "string";
}

export function isUseProviderHandler(
  handler: BrickEventHandler
): handler is UseProviderEventHandler {
  return typeof (handler as UseProviderEventHandler).useProvider === "string";
}

export function isCustomHandler(
  handler: BrickEventHandler
): handler is CustomBrickEventHandler {
  return !!(
    ((handler as CustomBrickEventHandler).target ||
      (handler as CustomBrickEventHandler).targetRef) &&
    ((handler as ExecuteCustomBrickEventHandler).method ||
      (handler as SetPropsCustomBrickEventHandler).properties)
  );
}

export function isExecuteCustomHandler(
  handler: CustomBrickEventHandler
): handler is ExecuteCustomBrickEventHandler {
  return !!(handler as ExecuteCustomBrickEventHandler).method;
}

export function isSetPropsCustomHandler(
  handler: CustomBrickEventHandler
): handler is SetPropsCustomBrickEventHandler {
  return !!(handler as SetPropsCustomBrickEventHandler).properties;
}

export function listenerFactory(
  handler: BrickEventHandler,
  context: PluginRuntimeContext,
  brick: HTMLElement
): EventListener {
  if (isBuiltinHandler(handler)) {
    const method = handler.action.split(".")[1] as any;
    switch (handler.action) {
      case "history.push":
      case "history.replace":
      case "history.pushQuery":
      case "history.replaceQuery":
      case "history.pushAnchor":
      case "history.block":
        return builtinHistoryListenerFactory(
          method,
          handler.args,
          handler,
          context
        );
      case "history.goBack":
      case "history.goForward":
      case "history.reload":
      case "history.unblock":
        return builtinHistoryWithoutArgsListenerFactory(
          method,
          handler,
          context
        );
      case "segue.push":
      case "segue.replace":
        return builtinSegueListenerFactory(
          method,
          handler.args,
          handler,
          context
        );
      case "alias.push":
      case "alias.replace":
        return builtinAliasListenerFactory(
          method,
          handler.args,
          handler,
          context
        );
      case "legacy.go":
        return builtinIframeListenerFactory(handler.args, handler, context);
      case "window.open":
        return builtinWindowListenerFactory(handler.args, handler, context);
      case "location.reload":
      case "location.assign":
        return builtinLocationListenerFactory(
          method,
          handler.args,
          handler,
          context
        );
      case "localStorage.setItem":
      case "localStorage.removeItem":
        return builtinLocalStorageListenerFactory(
          method,
          handler.args,
          handler,
          context
        );
      case "event.preventDefault":
        return ((event: CustomEvent) => {
          if (!looseCheckIf(handler, { ...context, event })) {
            return;
          }
          event.preventDefault();
        }) as EventListener;
      case "console.log":
      case "console.error":
      case "console.warn":
      case "console.info":
        return builtinConsoleListenerFactory(
          method,
          handler.args,
          handler,
          context
        );
      case "message.success":
      case "message.error":
      case "message.info":
      case "message.warn":
        return builtinMessageListenerFactory(
          method,
          handler.args,
          handler,
          context
        );
      case "handleHttpError":
        return ((event: CustomEvent) => {
          if (!looseCheckIf(handler, { ...context, event })) {
            return;
          }
          handleHttpError(event.detail);
        }) as EventListener;
      case "context.assign":
      case "context.replace":
        return builtinContextListenerFactory(
          method,
          handler.args,
          handler,
          context
        );
      case "tpl.dispatchEvent":
        return builtinTplDispatchEventFactory(
          brick,
          handler.args,
          handler,
          context
        );
      case "message.subscribe":
      case "message.unsubscribe":
        return builtinWebSocketListenerFactory(
          brick,
          method,
          handler.args,
          handler,
          handler.callback,
          context
        );
      case "theme.setDarkTheme":
      case "theme.setLightTheme":
        return ((event: CustomEvent) => {
          if (!looseCheckIf(handler, { ...context, event })) {
            return;
          }
          applyTheme(
            handler.action === "theme.setDarkTheme" ? "dark" : "light"
          );
        }) as EventListener;
      case "mode.setDashboardMode":
      case "mode.setDefaultMode":
        return ((event: CustomEvent) => {
          if (!looseCheckIf(handler, { ...context, event })) {
            return;
          }
          applyMode(
            handler.action === "mode.setDashboardMode" ? "dashboard" : "default"
          );
        }) as EventListener;
      case "menu.clearMenuTitleCache":
        return ((event: CustomEvent) => {
          if (!looseCheckIf(handler, { ...context, event })) {
            return;
          }
          clearMenuTitleCache();
        }) as EventListener;
      case "menu.clearMenuCache":
        return ((event: CustomEvent) => {
          if (!looseCheckIf(handler, { ...context, event })) {
            return;
          }
          clearMenuCache();
        }) as EventListener;
      default:
        return () => {
          // eslint-disable-next-line no-console
          console.error("unknown event listener action:", handler.action);
        };
    }
  }

  if (isUseProviderHandler(handler)) {
    return usingProviderFactory(handler, context, brick);
  }

  if (isCustomHandler(handler)) {
    return customListenerFactory(handler, handler, context, brick);
  }
}

function usingProviderFactory(
  handler: UseProviderEventHandler,
  context: PluginRuntimeContext,
  brick: HTMLElement
): EventListener {
  return async function (event: CustomEvent): Promise<void> {
    if (!looseCheckIf(handler, { ...context, event })) {
      return;
    }
    try {
      const providerBrick = await _internalApiGetProviderBrick(
        handler.useProvider
      );
      brickCallback(providerBrick, handler, "resolve", context, brick, event);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(httpErrorToString(error));
    }
  } as unknown as EventListener;
}

function builtinTplDispatchEventFactory(
  brick: HTMLElement,
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    const tpl = getParentTemplate(brick);
    if (!tpl) {
      // eslint-disable-next-line no-console
      console.warn("Parent template not found for brick:", brick);
      return;
    }
    const [type, init] = argsFactory(args, context, event) as [
      string,
      CustomEventInit
    ];
    tpl.dispatchEvent(new CustomEvent(type, init));
  } as EventListener;
}

function builtinContextListenerFactory(
  method: "assign" | "replace",
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    const [name, value] = argsFactory(args, context, event);
    if (typeof name !== "string") {
      // eslint-disable-next-line no-console
      console.error("Invalid context name:", name);
      return;
    }
    const { storyboardContext } = _internalApiGetCurrentContext();
    const contextItem: StoryboardContextItem = storyboardContext.get(name);
    if (!contextItem) {
      // eslint-disable-next-line no-console
      console.warn(
        `Context "${name}" is not declared, we recommend declaring it first.`
      );
      storyboardContext.set(name, {
        type: "free-variable",
        value,
      });
      return;
    }
    if (contextItem.type !== "free-variable") {
      // eslint-disable-next-line no-console
      console.error(
        `Conflict storyboard context "${name}", expected "free-variable", received "${contextItem.type}".`
      );
      return;
    }
    // `context.replace`
    if (method === "replace") {
      contextItem.value = value;
    } else {
      // `context.assign`
      const previousValue = contextItem.value;
      if (isObject(previousValue)) {
        Object.assign(previousValue, value);
      } else {
        // eslint-disable-next-line no-console
        console.warn(
          `Non-object current value of context "${name}" for "context.assign", try "context.replace" instead.`
        );
        contextItem.value = value;
      }
    }
    if (contextItem.onChange) {
      for (const handler of ([] as BrickEventHandler[]).concat(
        contextItem.onChange
      )) {
        listenerFactory(
          handler,
          context,
          contextItem.brick?.element
        )(
          new CustomEvent("context.change", {
            detail: contextItem.value,
          })
        );
      }
    }
  } as EventListener;
}

function builtinLocationListenerFactory(
  method: "assign" | "reload",
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    if (method === "assign") {
      const [url] = argsFactory(args, context, event) as [string];
      location.assign(url);
    } else {
      location[method]();
    }
  } as EventListener;
}

function builtinSegueListenerFactory(
  method: "push" | "replace",
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    const { app, segues } = _internalApiGetCurrentContext();
    getHistory()[method](
      getUrlBySegueFactory(
        app,
        segues
      )(
        ...(argsFactory(args, context, event) as Parameters<
          ReturnType<typeof getUrlBySegueFactory>
        >)
      )
    );
  } as EventListener;
}

function builtinAliasListenerFactory(
  method: "push" | "replace",
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    const { app } = _internalApiGetCurrentContext();
    getHistory()[method](
      getUrlByAliasFactory(app)(
        ...(argsFactory(args, context, event) as Parameters<
          ReturnType<typeof getUrlByAliasFactory>
        >)
      )
    );
  } as EventListener;
}

function builtinWebSocketListenerFactory(
  brick: HTMLElement,
  method: "subscribe" | "unsubscribe",
  args: any[],
  ifContainer: IfContainer,
  callback: BrickEventHandlerCallback,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }

    const [channel, messageTopic] = argsFactory(args, context, event) as [
      string,
      PluginWebSocketMessageTopic
    ];

    const { system, topic } = messageTopic || {};
    getMessageDispatcher()[method](
      channel,
      { system, topic },
      { ...callback, brick, context }
    );
  } as EventListener;
}

function builtinIframeListenerFactory(
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  const legacyIframeMountPoint = document.querySelector(
    "#legacy-iframe-mount-point"
  );

  const postMessage = (url: string): void => {
    const iframe = legacyIframeMountPoint.firstChild as HTMLIFrameElement;
    if (
      iframe &&
      iframe.contentWindow &&
      (iframe.contentWindow as any).angular
    ) {
      iframe.contentWindow.postMessage(
        {
          type: "location.url",
          url,
        },
        location.origin
      );
    }
  };

  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    const [url] = argsFactory(args, context, event) as [string];
    postMessage(url);
  } as EventListener;
}

function builtinWindowListenerFactory(
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    const [url, target] = argsFactory(args, context, event) as [string, string];
    window.open(url, target || "_self");
  } as EventListener;
}

function findRefElement(brick: RuntimeBrickElement, ref: string): HTMLElement {
  return getParentTemplate(brick)?.$$getElementByRef?.(ref);
}

function getParentTemplate(brick: RuntimeBrickElement): RuntimeBrickElement {
  let tpl = brick;
  while (
    (tpl =
      (tpl as RuntimeBrickElementWithTplSymbols)[symbolForParentTemplate] ||
      (tpl as RuntimeBrickElementWithTplSymbols)[
        symbolForParentRefForUseBrickInPortal
      ]?.current ||
      tpl.parentElement)
  ) {
    if (tpl.$$typeof === "custom-template") {
      return tpl;
    }
  }
}

function customListenerFactory(
  handler: CustomBrickEventHandler,
  ifContainer: IfContainer,
  context: PluginRuntimeContext,
  brick: HTMLElement
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    let targets: HTMLElement[] = [];
    if (typeof handler.target === "string") {
      if (handler.target === "_self") {
        targets.push(brick);
      } else if (handler.multiple) {
        targets = Array.from(document.querySelectorAll(handler.target));
      } else {
        const found = document.querySelector(handler.target) as HTMLElement;
        if (found !== null) {
          targets.push(found);
        }
      }
    } else if (handler.target) {
      targets.push(handler.target as HTMLElement);
    } else if (handler.targetRef) {
      const found = findRefElement(brick, handler.targetRef);
      if (found) {
        targets.push(found);
      }
    }
    if (targets.length === 0) {
      // eslint-disable-next-line no-console
      console.error("target not found:", handler.target || handler.targetRef);
      return;
    }
    if (isExecuteCustomHandler(handler)) {
      targets.forEach((target) => {
        brickCallback(target, handler, handler.method, context, brick, event, {
          useEventAsDefault: true,
        });
      });
    } else if (isSetPropsCustomHandler(handler)) {
      setProperties(
        targets,
        handler.properties,
        {
          ...context,
          event,
        },
        handler.injectDeep !== false
      );
    }
  } as EventListener;
}

async function brickCallback(
  target: HTMLElement,
  handler: ExecuteCustomBrickEventHandler | UseProviderEventHandler,
  method: string,
  context: PluginRuntimeContext,
  brick: HTMLElement,
  event: CustomEvent,
  options?: ArgsFactoryOptions
): Promise<void> {
  if (typeof (target as any)[method] !== "function") {
    // eslint-disable-next-line no-console
    console.error("target has no method:", {
      target,
      method: method,
    });
    return;
  }
  let argsFactoryResult = argsFactory(handler.args, context, event, options);

  if ((handler as UseProviderEventHandler).useProvider) {
    if (isCustomApiProvider((handler as UseProviderEventHandler).useProvider)) {
      const allMicroAppApiOrchestrationMap =
        await _internalApiGetMicroAppApiOrchestrationMap();
      argsFactoryResult = getArgsOfCustomApi(
        (handler as UseProviderEventHandler).useProvider,
        allMicroAppApiOrchestrationMap,
        argsFactoryResult
      );
    }
  }
  const task = (): unknown => (target as any)[method](...argsFactoryResult);
  const { success, error, finally: finallyHook } = handler.callback ?? {};
  if (success || error || finallyHook) {
    try {
      // Try to catch synchronized tasks too.
      const result = await task();
      if (success) {
        try {
          const successEvent = new CustomEvent("callback.success", {
            detail: result,
          });
          [].concat(success).forEach((eachSuccess) => {
            listenerFactory(eachSuccess, context, brick)(successEvent);
          });
        } catch (err) {
          // Do not throw errors in `callback.success`,
          // to avoid the following triggering of `callback.error`.
          // eslint-disable-next-line
          console.error(err);
        }
      }
    } catch (err) {
      if (error) {
        const errorEvent = new CustomEvent("callback.error", {
          detail: err,
        });
        [].concat(error).forEach((eachError) => {
          listenerFactory(eachError, context, brick)(errorEvent);
        });
      } else {
        // eslint-disable-next-line
        console.error(err);
      }
    } finally {
      if (finallyHook) {
        const finallyEvent = new CustomEvent("callback.finally");
        [].concat(finallyHook).forEach((eachFinally) => {
          listenerFactory(eachFinally, context, brick)(finallyEvent);
        });
      }
    }
  } else {
    task();
  }
}

function builtinHistoryListenerFactory(
  method:
    | "push"
    | "replace"
    | "pushQuery"
    | "replaceQuery"
    | "pushAnchor"
    | "block",
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    (
      getHistory()[method === "block" ? "setBlockMessage" : method] as (
        ...args: unknown[]
      ) => unknown
    )(
      ...argsFactory(args, context, event, {
        useEventDetailAsDefault: true,
      })
    );
  } as EventListener;
}

function builtinHistoryWithoutArgsListenerFactory(
  method: "goBack" | "goForward" | "reload" | "unblock",
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    getHistory()[method]();
  } as EventListener;
}

function builtinConsoleListenerFactory(
  method: "log" | "error" | "warn" | "info",
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent): void {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    // eslint-disable-next-line no-console
    console[method](
      ...argsFactory(args, context, event, {
        useEventAsDefault: true,
      })
    );
  } as EventListener;
}

function builtinMessageListenerFactory(
  method: "success" | "error" | "info" | "warn",
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent) {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    message[method](
      ...(argsFactory(args, context, event) as Parameters<
        typeof message["success"]
      >)
    );
  } as EventListener;
}

function builtinLocalStorageListenerFactory(
  method: "setItem" | "removeItem",
  args: unknown[],
  ifContainer: IfContainer,
  context: PluginRuntimeContext
): EventListener {
  return function (event: CustomEvent) {
    if (!looseCheckIf(ifContainer, { ...context, event })) {
      return;
    }
    const [name, value] = argsFactory(args, context, event);
    if (method === "setItem") {
      if (value !== undefined) {
        localStorage.setItem(name as string, JSON.stringify(value));
      }
    } else if (method === "removeItem") {
      localStorage.removeItem(name as string);
    }
  } as EventListener;
}

interface ArgsFactoryOptions {
  useEventAsDefault?: boolean;
  useEventDetailAsDefault?: boolean;
}

function argsFactory(
  args: unknown[],
  context: PluginRuntimeContext,
  event: CustomEvent,
  options: ArgsFactoryOptions = {}
): unknown[] {
  return Array.isArray(args)
    ? (computeRealValue(
        args,
        {
          ...context,
          event,
        },
        true
      ) as unknown[])
    : options.useEventAsDefault
    ? [event]
    : options.useEventDetailAsDefault
    ? [event.detail]
    : [];
}
