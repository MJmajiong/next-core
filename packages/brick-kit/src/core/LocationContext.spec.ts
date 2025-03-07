import { Location } from "history";
import {
  RuntimeStoryboard,
  ResolveConf,
  Storyboard,
} from "@next-core/brick-types";
import { LocationContext, MountRoutesResult } from "./LocationContext";
import { Kernel } from "./Kernel";
import { isLoggedIn, getAuth } from "../auth";
import * as history from "../history";
import * as runtime from "../core/Runtime";
import * as md from "./MessageDispatcher";
import { applyTheme } from "../themeAndMode";
import { ResolveRequestError } from "./Resolver";
import { validatePermissions } from "../internal/checkPermissions";
import { symbolForTplContextId } from "./CustomTemplates/constants";

jest.mock("../auth");
jest.mock("./MessageDispatcher");
jest.mock("../themeAndMode");
jest.mock("../internal/checkPermissions");
const consoleLog = jest.spyOn(console, "log").mockImplementation(() => void 0);
const consoleInfo = jest
  .spyOn(console, "info")
  .mockImplementation(() => void 0);
jest.spyOn(console, "warn").mockImplementation(() => void 0);
jest.spyOn(console, "error").mockImplementation(() => void 0);
jest.spyOn(md, "getMessageDispatcher").mockImplementation(
  () =>
    ({
      create: jest.fn(),
    } as any)
);
const spyOnIsLoggedIn = isLoggedIn as jest.Mock;
(getAuth as jest.Mock).mockReturnValue({
  username: "easyops",
  userInstanceId: "acbd46b",
  accessRule: "cmdb",
  isAdmin: false,
});

jest.spyOn(history, "getHistory").mockReturnValue({
  location: {
    hash: "",
  },
} as any);

const spyOnGetCurrentContext = jest.spyOn(
  runtime,
  "_internalApiGetCurrentContext"
);
const spyOnDispatchEvent = jest.spyOn(window, "dispatchEvent");

describe("LocationContext", () => {
  const kernel: Kernel = {
    mountPoints: {
      main: {},
      bg: document.createElement("div"),
      portal: {},
    },
    bootstrapData: {
      storyboards: [],
      brickPackages: [
        {
          filePath: "all.js",
        },
      ],
    },
    nextApp: {
      id: "hello",
      name: "Hello",
      homepage: "/hello",
    },
    unsetBars: jest.fn(),
    menuBar: {
      element: {},
    },
    appBar: {
      element: {
        breadcrumb: [],
      },
    },
    toggleBars: jest.fn(),
    getFeatureFlags: jest.fn().mockReturnValue({
      testing: true,
    }),
  } as any;

  const getInitialMountResult = (): MountRoutesResult => ({
    main: [],
    menuInBg: [],
    portal: [],
    menuBar: {},
    appBar: {
      breadcrumb: kernel.appBar.element.breadcrumb,
    },
    flags: {
      redirect: undefined,
    },
  });

  afterEach(() => {
    spyOnIsLoggedIn.mockReset();
    jest.clearAllMocks();
  });

  describe("matchStoryboard", () => {
    const storyboards: RuntimeStoryboard[] = [
      {
        app: {
          id: "hello",
          name: "Hello",
          homepage: "/hello",
        },
        routes: [
          {
            path: "/hello",
            public: true,
            bricks: [],
          },
        ],
      },
      {
        app: {
          id: "hello-world",
          name: "Hello World",
          homepage: "/hello/world",
        },
        routes: [
          {
            path: "/hello/world",
            public: true,
            bricks: [],
          },
        ],
      },
      {
        app: {
          id: "oops",
          name: "OOPS",
          // Legacy storyboard with no homepage.
          homepage: null,
        },
      },
    ];

    it("should handle match missed", () => {
      const context = new LocationContext(kernel, {
        pathname: "/",
        search: "",
        hash: "",
        state: {},
      });
      const storyboard = context.matchStoryboard(storyboards);
      expect(storyboard).toBe(undefined);
    });

    it("should handle match hit", () => {
      const context = new LocationContext(kernel, {
        pathname: "/hello",
        search: "",
        hash: "",
        state: {},
      });
      const storyboard = context.matchStoryboard(storyboards);
      expect(storyboard.app.id).toBe("hello");
    });

    it("should handle match hit sub-path", () => {
      const context = new LocationContext(kernel, {
        pathname: "/hello/everyone",
        search: "",
        hash: "",
        state: {},
      });
      const storyboard = context.matchStoryboard(storyboards);
      expect(storyboard.app.id).toBe("hello");
    });

    it("should handle match more precisely", () => {
      const context = new LocationContext(kernel, {
        pathname: "/hello/world",
        search: "",
        hash: "",
        state: {},
      });
      const storyboard = context.matchStoryboard(storyboards);
      expect(storyboard.app.id).toBe("hello-world");
    });

    it("should handle standalone micro-apps", () => {
      window.STANDALONE_MICRO_APPS = true;
      const context = new LocationContext(kernel, {
        pathname: "/hello/world",
        search: "",
        hash: "",
        state: {},
      });
      const storyboard = context.matchStoryboard(storyboards.slice(0, 1));
      expect(storyboard.app.id).toBe("hello");
      window.STANDALONE_MICRO_APPS = false;
    });
  });

  describe("mountRoutes", () => {
    it("should mount nothing if match missed", async () => {
      const context = new LocationContext(kernel, {
        pathname: "/hello",
        search: "",
        hash: "",
        state: {},
      });
      const result = await context.mountRoutes(
        [],
        undefined,
        getInitialMountResult()
      );
      expect(result).toMatchObject({
        main: [],
        menuBar: {},
        appBar: {},
        flags: {
          redirect: undefined,
        },
      });
    });

    it("should redirect if not logged in", async () => {
      const location = {
        pathname: "/",
        search: "",
        hash: "",
        state: {},
      };
      const context = new LocationContext(kernel, location);
      spyOnIsLoggedIn.mockReturnValueOnce(false);
      const result = await context.mountRoutes(
        [
          {
            path: "/",
            bricks: [],
          },
        ],
        undefined,
        getInitialMountResult()
      );
      expect(result).toMatchObject({
        main: [],
        menuBar: {},
        appBar: {},
        flags: {
          unauthenticated: true,
          redirect: undefined,
        },
      });
    });

    it("should redirect if match redirected", async () => {
      const context = new LocationContext(kernel, {
        pathname: "/hello",
        search: "",
        hash: "",
        state: {},
      });
      spyOnIsLoggedIn.mockReturnValue(true);
      const result = await context.mountRoutes(
        [
          {
            path: "/hello",
            redirect: "/oops",
          },
        ],
        undefined,
        getInitialMountResult()
      );
      expect(result).toMatchObject({
        main: [],
        menuBar: {},
        appBar: {},
        flags: {
          redirect: {
            path: "/oops",
          },
        },
      });
    });

    it("should validate permissions when permissionsPreCheck has been defined", async () => {
      const context = new LocationContext(kernel, {
        pathname: "/",
        search: "",
        hash: "",
        state: {},
      });
      spyOnIsLoggedIn.mockReturnValue(true);
      spyOnGetCurrentContext.mockReturnValueOnce(context.getCurrentContext());
      await context.mountRoutes(
        [
          {
            path: "/",
            permissionsPreCheck: ["<% CTX.instanceUpdateAction %>"],
            bricks: [],
            context: [
              {
                name: "instanceUpdateAction",
                value: "cmdb_HOST_instance_update",
              },
            ],
          },
        ],
        undefined,
        getInitialMountResult()
      );
      expect(validatePermissions).toHaveBeenCalledWith([
        "cmdb_HOST_instance_update",
      ]);
    });

    it("should ignore validating permissions if not logged in", async () => {
      const context = new LocationContext(kernel, {
        pathname: "/",
        search: "",
        hash: "",
        state: {},
      });
      spyOnIsLoggedIn.mockReturnValue(false);
      await context.mountRoutes(
        [
          {
            path: "/",
            permissionsPreCheck: ["<% CTX.instanceUpdateAction %>"],
            bricks: [],
          },
        ],
        undefined,
        getInitialMountResult()
      );
      expect(validatePermissions).not.toBeCalled();
    });

    it("should mount if match hit", async () => {
      const context = new LocationContext(kernel, {
        pathname: "/",
        search: "",
        hash: "",
        state: {},
      });
      spyOnIsLoggedIn.mockReturnValue(true);

      spyOnGetCurrentContext.mockReturnValue(context.getCurrentContext());

      jest
        .spyOn(context.resolver, "resolveOne")
        .mockImplementationOnce(
          async (
            type: any,
            resolveConf: ResolveConf,
            conf: Record<string, any>
          ) => {
            Object.assign(conf, resolveConf.transform);
          }
        );

      jest
        .spyOn(context.resolver, "resolve")
        .mockImplementation((brickConf) => {
          if (brickConf.lifeCycle?.useResolves?.length > 0) {
            return Promise.reject(new ResolveRequestError("Invalid request"));
          }
          return Promise.resolve();
        });

      const result = await context.mountRoutes(
        [
          {
            path: "/",
            providers: [
              "provider-a",
              {
                brick: "provider-b",
                properties: {
                  args: ["good"],
                },
              },
            ],
            context: [
              {
                name: "myFreeContext",
                value: "bad",
                if: "<% FLAGS['should-not-enabled'] %>",
              },
              {
                name: "myFreeContext",
                value: "good",
                if: "<% !FLAGS['should-not-enabled'] %>",
              },
              {
                name: "myAsyncContext",
                resolve: {
                  provider: "provider-c",
                  transform: {
                    value: "even better",
                  },
                },
              },
              {
                name: "myAsyncContext",
                resolve: {
                  provider: "provider-d",
                  transform: {
                    value: "turns worse",
                  },
                  if: "<% CTX.myFreeContext === 'bad' %>",
                },
              },
              {
                name: "myFallbackToValueContext",
                resolve: {
                  provider: "provider-c",
                  transform: {
                    value: "provider return value",
                  },
                  if: "<% CTX.myFreeContext === 'bad' %>",
                },
                value: "default value",
              },
            ],
            type: "routes",
            routes: [
              {
                alias: "route alias",
                path: "/",
                analyticsData: {
                  prop1: "<% CTX.myAsyncContext %>",
                },
                bricks: [
                  {
                    if: "${FLAGS.testing}",
                    brick: "div",
                    properties: {
                      title:
                        "<% `${CTX.myFreeContext} ${CTX.myAsyncContext} ${CTX.myFallbackToValueContext}` %>",
                      useBrick: {
                        brick: "useBrick-a",
                        properties: {
                          useBrick: {
                            brick: "useBrick-in-useBrick-b",
                            slots: {
                              content: {
                                bricks: [
                                  {
                                    brick: "slots-useBrick-in-useBrick-c",
                                  },
                                ],
                                type: "bricks",
                              },
                            },
                          },
                        },
                        slots: {
                          content: {
                            bricks: [
                              {
                                brick: "slots-in-useBrick-d",
                                slots: "error",
                              },
                              {
                                brick: "slots-in-useBrick-g",
                                slots: null,
                              },
                              {
                                brick: "slots-in-useBrick-h",
                                slots: [
                                  {
                                    brick: "slots-in-brick-i",
                                  },
                                ],
                              },
                            ],
                            type: "bricks",
                          },
                          error1: {
                            bricks: {
                              brick: "error-brick",
                            },
                          },
                          error2: {
                            bricks: [
                              {
                                useBrick: "1",
                                slots: {
                                  content: "slots-in-brick-j",
                                },
                              },
                              {
                                useBrick: 2,
                              },
                              {
                                useBrick: null,
                              },
                              {
                                useBrick: undefined,
                              },
                            ],
                          },
                        },
                      },
                      columns: [
                        {
                          title: "title-1",
                          label: "label-1",
                          useBrick: true,
                        },
                        {
                          title: "title-2",
                          label: "label-2",
                          useBrick: {
                            brick: "deep-useBrick-e",
                            properties: {
                              useBrick: {
                                brick: "deep-useBrick-in-useBrick-f",
                              },
                            },
                          },
                        },
                      ],
                    },
                    context: [
                      {
                        name: "myNewPropContext",
                        property: "title",
                      },
                      {
                        name: "myFreeContextDefinedOnBrick",
                        value: "some value",
                        onChange: {
                          action: "console.log",
                        },
                      },
                    ],
                    exports: {
                      title: "CTX.myPropContext",
                    },
                    events: {
                      click: {
                        action: "history.push",
                      },
                    },
                    lifeCycle: {
                      onBeforePageLoad: {
                        action: "theme.setDarkTheme",
                      },
                      onPageLoad: {
                        action: "console.log",
                      },
                      onBeforePageLeave: {
                        action: "console.log",
                      },
                      onPageLeave: {
                        action: "console.log",
                      },
                      onAnchorLoad: {
                        action: "console.log",
                      },
                      onAnchorUnload: {
                        action: "console.log",
                      },
                      onMessageClose: {
                        action: "console.log",
                      },
                    },
                    slots: {
                      menu: {
                        type: "bricks",
                        bricks: [
                          {
                            brick: "p",
                          },
                        ],
                      },
                      content: {
                        type: "routes",
                        routes: [
                          {
                            path: "/",
                            bricks: [],
                            menu: {
                              sidebarMenu: {
                                title: "menu title",
                                menuItems: [],
                              },
                              pageTitle: "page title",
                              breadcrumb: {
                                items: [
                                  {
                                    text: "first breadcrumb",
                                  },
                                ],
                              },
                            },
                          },
                        ],
                      },
                      extendA: {
                        type: "routes",
                        routes: [
                          {
                            path: "/",
                            bricks: [],
                            menu: {
                              type: "brick",
                              brick: "a",
                            },
                          },
                        ],
                      },
                      extendB: {
                        type: "routes",
                        routes: [
                          {
                            path: "/",
                            bricks: [],
                            menu: {
                              type: "brick",
                              brick: "b",
                              events: {},
                              lifeCycle: {
                                onPageLoad: {
                                  action: "console.info",
                                },
                                onBeforePageLeave: {
                                  action: "console.info",
                                },
                                onPageLeave: {
                                  action: "console.info",
                                },
                                onAnchorLoad: {
                                  action: "console.info",
                                  args: ["${EVENT.detail.anchor}"],
                                },
                                onAnchorUnload: {
                                  action: "console.info",
                                },
                                onMessageClose: {
                                  action: "console.info",
                                },
                              },
                            },
                          },
                        ],
                      },
                      extendC: {
                        type: "routes",
                        routes: [
                          {
                            path: "/",
                            bricks: [],
                            menu: {
                              breadcrumb: {
                                overwrite: true,
                                items: [
                                  {
                                    text: "second breadcrumb",
                                  },
                                ],
                                noCurrentApp: true,
                              },
                            },
                          },
                        ],
                      },
                      extendD: {
                        type: "routes",
                        routes: [
                          {
                            path: "/",
                            bricks: [],
                            menu: false,
                          },
                        ],
                      },
                      extendE: {
                        type: "routes",
                        routes: [
                          {
                            path: "/",
                            bricks: [],
                            menu: {},
                          },
                        ],
                      },
                      extendF: {
                        type: "invalid",
                        routes: [],
                      },
                      extendG: {
                        type: "routes",
                        routes: [
                          {
                            path: "/",
                            bricks: [
                              {
                                brick: "modal-a",
                                portal: true,
                                properties: {
                                  args: ["a"],
                                },
                                slots: {
                                  content: {
                                    type: "bricks",
                                    bricks: [
                                      {
                                        brick: "h2",
                                        properties: {
                                          textContent: "modal heading",
                                        },
                                      },
                                      {
                                        brick: "p",
                                        portal: true,
                                        properties: {
                                          textContent: "portal in portal",
                                        },
                                      },
                                    ],
                                  },
                                },
                              },
                            ],
                            menu: {},
                          },
                        ],
                      },
                    },
                    [symbolForTplContextId]: "tpl-1",
                  },
                  {
                    if: "${FLAGS.testing|not}",
                    brick: "div",
                  },
                  {
                    brick: "brick-will-fail",
                    lifeCycle: {
                      useResolves: [
                        {
                          useProvider: "provider-will-reject",
                        },
                      ],
                    },
                  },
                  {
                    template: "template-will-fail",
                    lifeCycle: {
                      useResolves: [
                        {
                          useProvider: "provider-will-reject",
                        },
                      ],
                    },
                  },
                ],
              },
            ],
          },
        ] as any,
        undefined,
        getInitialMountResult()
      );
      expect(result).toMatchObject({
        route: expect.objectContaining({
          path: "/",
          alias: "route alias",
        }),
        menuBar: {
          menu: {
            title: "menu title",
            menuItems: [],
          },
        },
        appBar: {
          pageTitle: "page title",
          breadcrumb: [
            {
              text: "second breadcrumb",
            },
          ],
          noCurrentApp: true,
        },
        flags: {
          barsHidden: true,
          redirect: undefined,
        },
        analyticsData: {
          prop1: "even better",
        },
      });
      expect(result.main).toMatchObject([
        {
          type: "div",
          properties: {
            title: "good even better default value",
          },
          events: {
            click: {
              action: "history.push",
            },
          },
          children: [
            {
              type: "p",
              slotId: "menu",
            },
          ],
        },
        {
          type: "basic-bricks.brick-error",
          properties: {
            brickName: "brick-will-fail",
            errorType: "ResolveRequestError",
            errorMessage: "Invalid request",
            isLegacyTemplate: false,
          },
        },
        {
          type: "basic-bricks.brick-error",
          properties: {
            brickName: "template-will-fail",
            errorType: "ResolveRequestError",
            errorMessage: "Invalid request",
            isLegacyTemplate: true,
          },
        },
      ]);
      const { storyboardContext } = result.main[0].context;
      expect(storyboardContext.get("myNewPropContext")).toMatchObject({
        type: "brick-property",
        prop: "title",
      });
      expect(
        storyboardContext.get("myFreeContextDefinedOnBrick")
      ).toMatchObject({
        type: "free-variable",
        value: "some value",
        eventTarget: expect.anything(),
      });
      expect(result.main[0].properties).toEqual({
        title: "good even better default value",
        useBrick: {
          brick: "useBrick-a",
          [symbolForTplContextId]: "tpl-1",
          properties: {
            useBrick: {
              brick: "useBrick-in-useBrick-b",
              [symbolForTplContextId]: "tpl-1",
              slots: {
                content: {
                  bricks: [
                    {
                      brick: "slots-useBrick-in-useBrick-c",
                      [symbolForTplContextId]: "tpl-1",
                    },
                  ],
                  type: "bricks",
                },
              },
            },
          },
          slots: {
            content: {
              bricks: [
                {
                  brick: "slots-in-useBrick-d",
                  slots: "error",
                  [symbolForTplContextId]: "tpl-1",
                },
                {
                  brick: "slots-in-useBrick-g",
                  slots: null,
                  [symbolForTplContextId]: "tpl-1",
                },
                {
                  brick: "slots-in-useBrick-h",
                  slots: [
                    {
                      brick: "slots-in-brick-i",
                    },
                  ],
                  [symbolForTplContextId]: "tpl-1",
                },
              ],
              type: "bricks",
            },
            error1: {
              bricks: {
                brick: "error-brick",
              },
            },
            error2: {
              bricks: [
                {
                  useBrick: "1",
                  slots: {
                    content: "slots-in-brick-j",
                  },
                  [symbolForTplContextId]: "tpl-1",
                },
                {
                  useBrick: 2,
                  [symbolForTplContextId]: "tpl-1",
                },
                {
                  useBrick: null,
                  [symbolForTplContextId]: "tpl-1",
                },
                {
                  useBrick: undefined,
                  [symbolForTplContextId]: "tpl-1",
                },
              ],
            },
          },
        },
        columns: [
          {
            title: "title-1",
            label: "label-1",
            useBrick: true,
          },
          {
            title: "title-2",
            label: "label-2",
            useBrick: {
              brick: "deep-useBrick-e",
              [symbolForTplContextId]: "tpl-1",
              properties: {
                useBrick: {
                  brick: "deep-useBrick-in-useBrick-f",
                  [symbolForTplContextId]: "tpl-1",
                },
              },
            },
          },
        ],
      });
      expect(kernel.mountPoints.bg.children.length).toBe(2);
      expect(kernel.mountPoints.bg.children[0].tagName).toBe("PROVIDER-A");
      expect(kernel.mountPoints.bg.children[1].tagName).toBe("PROVIDER-B");
      expect((kernel.mountPoints.bg.children[1] as any).args).toEqual(["good"]);

      expect(result.portal).toMatchObject([
        {
          type: "modal-a",
          properties: {
            args: ["a"],
          },
          children: [
            {
              type: "h2",
              properties: {
                textContent: "modal heading",
              },
              children: [],
              slotId: "content",
            },
          ],
          slotId: undefined,
        },
        {
          type: "p",
          properties: {
            textContent: "portal in portal",
          },
          children: [],
          slotId: undefined,
        },
      ]);

      context.handleBeforePageLoad();
      expect(applyTheme).toBeCalledWith("dark");
      context.handlePageLoad();
      context.handleAnchorLoad();
      (history.getHistory as jest.Mock).mockReturnValue({
        location: {
          hash: "#yes",
        },
      });
      context.handleAnchorLoad();
      context.handleBeforePageLeave({
        location: { pathname: "/home" } as Location,
        action: "POP",
      });
      context.handlePageLeave();
      context.handleMessageClose(new CloseEvent("error"));
      context.handleMessage();

      expect(spyOnDispatchEvent).toBeCalledWith(
        expect.objectContaining({ type: "page.load" })
      );

      // Assert `console.log()`.
      expect(consoleLog).toHaveBeenNthCalledWith(
        1,
        new CustomEvent("page.load")
      );
      expect(consoleLog).toHaveBeenNthCalledWith(
        2,
        new CustomEvent("anchor.unload")
      );
      expect(consoleLog).toHaveBeenNthCalledWith(
        3,
        new CustomEvent("anchor.load", {
          detail: {
            hash: "#yes",
            anchor: "yes",
          },
        })
      );
      expect(consoleLog).toHaveBeenNthCalledWith(
        4,
        new CustomEvent("page.beforeLeave", {
          detail: {
            location: { pathname: "/home" },
            action: "POP",
          },
        })
      );
      expect(consoleLog).toHaveBeenNthCalledWith(
        5,
        new CustomEvent("page.leave")
      );

      expect(consoleLog).toHaveBeenNthCalledWith(
        6,
        new CustomEvent("message.close")
      );

      // Assert `console.info()`.
      expect(consoleInfo).toHaveBeenNthCalledWith(
        1,
        new CustomEvent("page.load")
      );
      expect(consoleInfo).toHaveBeenNthCalledWith(
        2,
        new CustomEvent("anchor.unload")
      );
      expect(consoleInfo).toHaveBeenNthCalledWith(3, "yes");
      expect(consoleInfo).toHaveBeenNthCalledWith(
        4,
        new CustomEvent("page.beforeLeave", {
          detail: {
            location: { pathname: "/home" },
            action: "POP",
          },
        })
      );
      expect(consoleInfo).toHaveBeenNthCalledWith(
        5,
        new CustomEvent("page.leave")
      );
      expect(consoleInfo).toHaveBeenNthCalledWith(
        6,
        new CustomEvent("message.close")
      );
    });

    it("resolve menu should work", async () => {
      const context = new LocationContext(kernel, {
        pathname: "/",
        search: "",
        hash: "",
        state: {},
      });
      spyOnIsLoggedIn.mockReturnValue(true);
      jest
        .spyOn(context.resolver, "resolveOne")
        .mockImplementationOnce(
          (type: any, resolveConf: ResolveConf, conf: Record<string, any>) => {
            Object.assign(conf, resolveConf.transform);
            return Promise.resolve();
          }
        );
      const resolveConf = {
        provider: "provider-a",
        transform: {
          pageTitle: "A",
          sidebarMenu: {
            title: "title-a",
            menuItems: [
              {
                text: "item-1",
              },
            ],
          },
        },
      };

      const result = await context.mountRoutes(
        [
          {
            path: "/",
            providers: [
              "provider-a",
              {
                brick: "provider-b",
                properties: {
                  args: ["good"],
                },
              },
            ],
            menu: {
              type: "resolve",
              resolve: resolveConf,
            },
            bricks: [],
          },
        ],
        undefined,
        getInitialMountResult()
      );

      expect(result.menuBar).toMatchObject({
        menu: {
          title: "title-a",
          menuItems: [
            {
              text: "item-1",
            },
          ],
        },
      });
    });
  });

  it("getSubStoryboardByRoute should work", () => {
    const context = new LocationContext(kernel, {
      pathname: "/1/2",
      search: "",
      hash: "",
      state: {},
    });
    const storyboard = {
      app: {
        id: "a",
        homepage: "/1",
      },
      routes: [
        {
          path: "${APP.homepage}/2",
          bricks: null,
        },
        {
          path: "${APP.homepage}/3",
          bricks: null,
        },
      ],
    } as Partial<Storyboard>;
    spyOnIsLoggedIn.mockReturnValue(true);
    expect(context.getSubStoryboardByRoute(storyboard as Storyboard)).toEqual({
      app: {
        id: "a",
        homepage: "/1",
      },
      routes: [
        {
          path: "${APP.homepage}/2",
          bricks: null,
        },
      ],
    });
  });
});
