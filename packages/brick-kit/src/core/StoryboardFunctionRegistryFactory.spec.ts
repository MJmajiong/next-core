import {
  StoryboardFunctionRegistryFactory,
  FunctionCoverageCollector,
} from "./StoryboardFunctionRegistryFactory";

jest.mock("i18next", () => ({
  getFixedT(lang: string, ns: string) {
    return (key: string) => `${ns}:${key}`;
  },
}));

describe("StoryboardFunctions", () => {
  const {
    storyboardFunctions: fn,
    registerStoryboardFunctions,
    updateStoryboardFunction,
  } = StoryboardFunctionRegistryFactory();

  it("should register functions", () => {
    registerStoryboardFunctions(
      [
        {
          name: "sayHello",
          source: `
          function sayHello(data) {
            return FN.sayExclamation(I18N('HELLO') + ', ' + I18N_TEXT(data));
          }
        `,
        },
        {
          name: "sayExclamation",
          source: `
          function sayExclamation(sentence) {
            return sentence + '!';
          }
        `,
        },
        {
          name: "getImg",
          source: `
            function getImg() {
              return IMG.get("my-img.png");
            }
          `,
        },
      ],
      {
        id: "my-app",
      }
    );
    expect(fn.sayHello({ en: "world", zh: "世界" })).toBe(
      "$app-my-app:HELLO, 世界!"
    );
    expect(fn.sayExclamation("Oops")).toBe("Oops!");
    expect(fn.getImg()).toBe("micro-apps/my-app/images/my-img.png");

    updateStoryboardFunction("sayExclamation", {
      source: `
        function sayExclamation(sentence) {
          return sentence + '!!';
        }
      `,
    });
    expect(fn.sayHello({ en: "world", zh: "世界" })).toBe(
      "$app-my-app:HELLO, 世界!!"
    );
    expect(fn.sayExclamation("Oops")).toBe("Oops!!");
    expect(fn.getImg()).toBe("micro-apps/my-app/images/my-img.png");
  });

  it("should register no functions", () => {
    registerStoryboardFunctions(undefined);
  });

  it("should throw error if function not found", () => {
    expect(() => {
      fn.notExisted();
    }).toThrowErrorMatchingInlineSnapshot(`"fn.notExisted is not a function"`);
  });

  it("should throw error if try to write functions", () => {
    expect(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      fn.myFunc = () => 0;
    }).toThrowErrorMatchingInlineSnapshot(
      `"Cannot define property myFunc, object is not extensible"`
    );
  });
});

describe("Widget Functions", () => {
  const { storyboardFunctions: fn, registerStoryboardFunctions } =
    StoryboardFunctionRegistryFactory({
      widgetId: "my-widget",
    });

  it("should register functions", () => {
    registerStoryboardFunctions([
      {
        name: "sayHello",
        source: `
          function sayHello(data) {
            return FN.sayExclamation(I18N('HELLO') + ', ' + I18N_TEXT(data));
          }
        `,
      },
      {
        name: "sayExclamation",
        source: `
          function sayExclamation(sentence) {
            return sentence + '!';
          }
        `,
      },
      {
        name: "getImg",
        source: `
          function getImg() {
            return IMG.get("my-img.png");
          }
        `,
      },
    ]);
    expect(fn.sayHello({ en: "world", zh: "世界" })).toBe(
      "$widget-my-widget:HELLO, 世界!"
    );
    expect(fn.getImg()).toBe("bricks/my-widget/dist/assets/my-img.png");
  });
});

describe("collect coverage", () => {
  it("should collect coverage", () => {
    const collector: FunctionCoverageCollector = {
      beforeVisit: jest.fn(),
      beforeEvaluate: jest.fn(),
      beforeCall: jest.fn(),
      beforeBranch: jest.fn(),
    };
    const createCollector = (): FunctionCoverageCollector => collector;
    const { storyboardFunctions: fn, registerStoryboardFunctions } =
      StoryboardFunctionRegistryFactory({
        collectCoverage: {
          createCollector,
        },
      });
    registerStoryboardFunctions([
      {
        name: "test",
        source: `
          function test(a) {
            if (a) {
              return a;
            }
            return false;
          }
        `,
      },
      {
        name: "i18n",
        source: `
          function i18n(...args) {
            return I18N(...args);
          }
        `,
      },
      {
        name: "i18nText",
        source: `
          function i18nText(...args) {
            return I18N_TEXT(...args);
          }
        `,
      },
      {
        name: "getImg",
        source: `
          function getImg() {
            return IMG.get("my-img.png");
          }
        `,
      },
    ]);

    fn.test(1);
    expect(collector.beforeVisit).toBeCalledTimes(9);
    expect(collector.beforeEvaluate).toBeCalledTimes(6);
    expect(collector.beforeCall).toBeCalledTimes(1);
    expect(collector.beforeBranch).toBeCalledTimes(1);
    expect(collector.beforeBranch).toBeCalledWith(
      expect.objectContaining({
        type: "IfStatement",
      }),
      "if"
    );

    fn.test(0);
    expect(collector.beforeVisit).toBeCalledTimes(9);
    expect(collector.beforeEvaluate).toBeCalledTimes(10);
    expect(collector.beforeCall).toBeCalledTimes(2);
    expect(collector.beforeBranch).toBeCalledTimes(2);
    expect(collector.beforeBranch).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        type: "IfStatement",
      }),
      "else"
    );

    expect(fn.i18n("HELLO")).toBe("HELLO");
    expect(fn.i18nText({ zh: "你好", en: "Hello" })).toBe("Hello");
    expect(fn.getImg()).toBe("mock/images/my-img.png");
  });
});
