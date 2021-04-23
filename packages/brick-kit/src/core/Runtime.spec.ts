import { Kernel } from "./Kernel";
import { Runtime } from "./Runtime";
import { MountPoints } from "@next-core/brick-types";

jest.mock("./Kernel");

const spyOnKernel = Kernel as jest.Mock;

describe("Runtime", () => {
  let runtime: Runtime;
  let IsolatedRuntime: typeof Runtime;

  beforeEach(() => {
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      IsolatedRuntime = require("./Runtime").Runtime;
    });
    runtime = new IsolatedRuntime();
    spyOnKernel.mockClear();
  });

  it("should bootstrap", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    expect(spyOnKernel).toBeCalled();

    const mockKernelInstance = spyOnKernel.mock.instances[0];
    expect(mockKernelInstance.bootstrap).toBeCalledWith(mountPoints);
    const spyOnMenuBar = (mockKernelInstance.menuBar = {});
    const spyOnAppBar = (mockKernelInstance.appBar = {});

    expect(runtime.menuBar).toBe(spyOnMenuBar);
    expect(runtime.appBar).toBe(spyOnAppBar);
  });

  it("should toggleFilterOfBlur", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);

    expect(document.body.classList.contains("filter-of-blur")).toBe(false);
    runtime.toggleFilterOfBlur(true);
    expect(document.body.classList.contains("filter-of-blur")).toBe(true);
    runtime.toggleFilterOfBlur(false);
    expect(document.body.classList.contains("filter-of-blur")).toBe(false);
  });

  it("should toggleLaunchpadEffect", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);

    expect(document.body.classList.contains("launchpad-open")).toBe(false);
    runtime.toggleLaunchpadEffect(true);
    expect(document.body.classList.contains("launchpad-open")).toBe(true);
    runtime.toggleLaunchpadEffect(false);
    expect(document.body.classList.contains("launchpad-open")).toBe(false);
  });

  it("should throw if bootstrap more than once", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    expect(runtime.bootstrap(mountPoints)).rejects.toThrowError();
  });

  it("should get micro apps", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    const mockKernelInstance = spyOnKernel.mock.instances[0];
    mockKernelInstance.bootstrapData = {
      microApps: [
        {
          name: "a",
          id: "app-a",
        },
        {
          name: "b",
          id: "app-b",
          installStatus: "ok",
        },
        {
          id: "app-c",
          installStatus: "running",
        },
        {
          name: "d",
          id: "app-d",
          internal: true,
        },
      ],
    };
    expect(runtime.getMicroApps()).toEqual([
      {
        name: "a",
        id: "app-a",
      },
      {
        name: "b",
        id: "app-b",
        installStatus: "ok",
      },
      {
        id: "app-c",
        installStatus: "running",
      },
    ]);
    expect(runtime.getMicroApps({ excludeInstalling: true })).toEqual([
      {
        name: "a",
        id: "app-a",
      },
      {
        name: "b",
        id: "app-b",
        installStatus: "ok",
      },
    ]);
    expect(
      runtime.getMicroApps({ excludeInstalling: true, includeInternal: true })
    ).toEqual([
      {
        name: "a",
        id: "app-a",
      },
      {
        name: "b",
        id: "app-b",
        installStatus: "ok",
      },
      {
        name: "d",
        id: "app-d",
        internal: true,
      },
    ]);
    expect(runtime.getMicroApps({ includeInternal: true }).length).toBe(4);

    expect(runtime.hasInstalledApp("app-a")).toBe(true);
    expect(runtime.hasInstalledApp("app-b")).toBe(true);
    expect(runtime.hasInstalledApp("app-c")).toBe(false);
    expect(runtime.hasInstalledApp("app-d")).toBe(true);
  });

  it("should reload micro apps", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    const mockKernelInstance = spyOnKernel.mock.instances[0];
    mockKernelInstance.loadMicroApps = jest.fn();
    runtime.reloadMicroApps();
    expect(mockKernelInstance.loadMicroApps).toBeCalled();
  });

  it("should get homepage", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    const mockKernelInstance = spyOnKernel.mock.instances[0];
    mockKernelInstance.bootstrapData = {
      settings: {
        homepage: "/search",
      },
    };
    expect(runtime.getHomepage()).toEqual("/search");
  });

  it("should get root page if no settings", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    const mockKernelInstance = spyOnKernel.mock.instances[0];
    mockKernelInstance.bootstrapData = {};
    expect(runtime.getHomepage()).toEqual("/");
  });

  it("should get launchpad settings", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    const mockKernelInstance = spyOnKernel.mock.instances[0];
    mockKernelInstance.bootstrapData = {
      settings: {
        launchpad: {
          columns: 5,
        },
      },
    };
    expect(runtime.getLaunchpadSettings()).toEqual({
      columns: 5,
      rows: 4,
    });
  });

  it("should get brand settings", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    const mockKernelInstance = spyOnKernel.mock.instances[0];
    mockKernelInstance.bootstrapData = {
      settings: {
        brand: {
          base_title: "DevOps 管理专家",
        },
      },
    };
    expect(runtime.getBrandSettings()).toEqual({
      base_title: "DevOps 管理专家",
    });
  });

  it("should get misc settings", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    const mockKernelInstance = spyOnKernel.mock.instances[0];
    mockKernelInstance.bootstrapData = {
      settings: {
        misc: {
          foo: "bar",
        },
      },
    };
    expect(runtime.getMiscSettings()).toEqual({
      foo: "bar",
    });
  });

  it("should get desktops", async () => {
    const mountPoints: MountPoints = {} as any;
    await runtime.bootstrap(mountPoints);
    const mockKernelInstance = spyOnKernel.mock.instances[0];
    mockKernelInstance.bootstrapData = {};
    // Default is `[]`
    expect(runtime.getDesktops()).toEqual([]);
    mockKernelInstance.bootstrapData = {
      desktops: [
        {
          items: [],
        },
      ],
    };
    expect(runtime.getDesktops()).toEqual([
      {
        items: [],
      },
    ]);
  });
});
