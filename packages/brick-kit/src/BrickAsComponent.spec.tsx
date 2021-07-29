import React from "react";
import { mount } from "enzyme";
import { BrickConf, RuntimeBrickElement } from "@next-core/brick-types";
import * as listenerUtils from "./internal/bindListeners";
import {
  BrickAsComponent,
  ForwardRefSingleBrickAsComponent,
} from "./BrickAsComponent";
import * as runtime from "./core/Runtime";
import * as transformProperties from "./transformProperties";
import {
  RuntimeBrickElementWithTplSymbols,
  symbolForParentRefForUseBrickInPortal,
} from "./core/exports";

const bindListeners = jest.spyOn(listenerUtils, "bindListeners");
const spyOnResolve = jest.fn(
  (_brickConf: BrickConf, brick: any, context: any) => {
    brick.properties.title = "resolved";
  }
);
const _internalApiGetRouterState = jest
  .spyOn(runtime, "_internalApiGetRouterState")
  .mockReturnValue("mounted");
const sypOnTransformProperties = jest.spyOn(
  transformProperties,
  "transformProperties"
);
jest.spyOn(runtime, "_internalApiGetResolver").mockReturnValue({
  resolve: spyOnResolve,
} as any);
jest.spyOn(runtime, "_internalApiGetCurrentContext").mockReturnValue({
  hash: "#test",
} as any);
jest.spyOn(console, "warn").mockImplementation(() => void 0);

// Mock a custom element of `custom-existed`.
customElements.define(
  "custom-existed",
  class Tmp extends HTMLElement {
    get $$typeof(): string {
      return "brick";
    }
  }
);

describe("BrickAsComponent", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should work", async () => {
    const mockRef = {} as React.RefObject<HTMLElement>;
    const wrapper = mount(
      <BrickAsComponent
        useBrick={{
          brick: "div",
          properties: {
            id: "<% DATA.extraTips %>",
            useBrick: {
              brick: "span",
              if: "<% !!DATA.extraTips %>",
              properties: {
                any: "<% DATA.tips %>",
              },
              transform: {
                any: "@{tips}",
              },
              lifeCycle: {
                useResolves: [
                  {
                    useProvider: "my.provider",
                    args: ["<% DATA.extraTips %>"],
                  },
                ],
              },
            },
          },
          transform: "title",
          transformFrom: "tips",
          events: {
            "button.click": {
              action: "console.log",
              args: ["@{tips}"],
            },
          },
        }}
        data={{
          tips: "good",
          extraTips: "better",
        }}
        parentRefForUseBrickInPortal={mockRef}
      />
    );

    await (global as any).flushPromises();
    const div = wrapper.find("div").getDOMNode() as HTMLDivElement;
    expect(div.title).toBe("good");
    expect(div.id).toBe("better");
    expect((div as any).useBrick).toEqual({
      brick: "span",
      // `properties`, `transform`, `events` and `if` of `useBrick` inside
      // the properties of the root brick, are kept and to be transformed lazily.
      if: "<% !!DATA.extraTips %>",
      properties: {
        any: "<% DATA.tips %>",
      },
      transform: {
        any: "@{tips}",
      },
      lifeCycle: {
        useResolves: [
          {
            useProvider: "my.provider",
            args: ["better"],
          },
        ],
      },
    });
    expect(bindListeners.mock.calls[0][1]).toEqual({
      "button.click": {
        action: "console.log",
        args: ["good"],
      },
    });
    expect((div as RuntimeBrickElement).$$typeof).toBe("native");
    expect(
      (div as RuntimeBrickElementWithTplSymbols)[
        symbolForParentRefForUseBrickInPortal
      ]
    ).toBe(mockRef);
  });

  it("should work for multiple bricks", async () => {
    const wrapper = mount(
      <BrickAsComponent
        useBrick={[
          {
            brick: "custom-existed",
            transform: "title",
            transformFrom: "tips",
          },
          {
            brick: "custom-not-existed",
            transform: "title",
            transformFrom: "tips",
          },
        ]}
        data={{
          tips: "better",
        }}
      />
    );

    await (global as any).flushPromises();
    const existed = wrapper
      .find("custom-existed")
      .getDOMNode() as HTMLDivElement;
    expect(existed.title).toBe("better");
    expect((existed as RuntimeBrickElement).$$typeof).toBe("brick");
    const notExisted = wrapper
      .find("custom-not-existed")
      .getDOMNode() as HTMLDivElement;
    expect(notExisted.title).toBe("better");
    expect((notExisted as RuntimeBrickElement).$$typeof).toBe("invalid");
  });

  it("should work for `if`", async () => {
    const wrapper = mount(
      <BrickAsComponent
        useBrick={[
          {
            brick: "div",
            if: "@{disabled}",
            transform: "title",
            transformFrom: "tips",
          },
          {
            brick: "span",
            if: "@{enabled}",
            transform: "title",
            transformFrom: "tips",
          },
        ]}
        data={{
          tips: "better",
          enabled: true,
          disabled: false,
        }}
      />
    );

    await (global as any).flushPromises();
    const span = wrapper.find("span").getDOMNode() as HTMLDivElement;
    expect(span.title).toBe("better");
    expect(wrapper.find("div").length).toBe(0);
    expect(sypOnTransformProperties).toBeCalledTimes(1);
  });

  it("should work for unsupported `resolvable-if`", async () => {
    const wrapper = mount(
      <BrickAsComponent
        useBrick={[
          {
            brick: "div",
            if: {
              provider: "not-existed",
            } as any,
            transform: "title",
            transformFrom: "tips",
          },
        ]}
        data={{
          tips: "better",
          enabled: true,
          disabled: false,
        }}
      />
    );

    await (global as any).flushPromises();
    const div = wrapper.find("div").getDOMNode() as HTMLDivElement;
    expect(div.title).toBe("better");
  });

  it("should resolve", async () => {
    const wrapper = mount(
      <BrickAsComponent
        useBrick={{
          brick: "div",
          properties: {
            id: "hello",
            style: {
              color: "red",
            },
          },
          transform: "title",
          transformFrom: "tips",
          lifeCycle: {
            useResolves: [
              {
                ref: "my-provider",
              },
            ],
          },
        }}
        data={{
          tips: "good",
        }}
      />
    );
    await (global as any).flushPromises();
    expect(spyOnResolve.mock.calls[0][0]).toEqual({
      brick: "div",
      lifeCycle: {
        useResolves: [
          {
            ref: "my-provider",
          },
        ],
      },
    });
    expect(spyOnResolve.mock.calls[0][1]).toMatchObject({
      type: "div",
      properties: {
        id: "hello",
        style: {
          color: "red",
        },
      },
    });
    expect(spyOnResolve.mock.calls[0][2]).toEqual({
      hash: "#test",
    });
    const div = wrapper.find("div").getDOMNode() as HTMLDivElement;
    expect(div.id).toBe("hello");
    expect(div.title).toBe("resolved");
    expect(div.style.color).toBe("red");

    // Should ignore rendering if router state is initial.
    _internalApiGetRouterState.mockReturnValueOnce("initial");
    wrapper.setProps({
      data: {
        tips: "good",
      },
    });
    await (global as any).flushPromises();
    expect(spyOnResolve).toBeCalledTimes(1);
  });

  it("should work with ForwardRefSingleBrickAsComponent", async () => {
    let ref = null;
    const wrapper = mount(
      <ForwardRefSingleBrickAsComponent
        useBrick={{
          brick: "input",
        }}
        ref={(r) => {
          ref = r;
        }}
      />
    );

    await (global as any).flushPromises();
    expect(wrapper.find("input").instance()).toEqual(ref);
  });

  it("should work with slots", async () => {
    const wrapper = mount(
      <BrickAsComponent
        useBrick={{
          brick: "div",
          slots: {
            content: {
              bricks: [
                {
                  brick: "span",
                  transform: {
                    textContent: "<% DATA.tips %>",
                  },
                },
              ],
            },
            toolbar: {} as any,
          },
        }}
        data={{
          tips: "good",
        }}
      />
    );

    await (global as any).flushPromises();
    const div = wrapper.find("div").getDOMNode() as HTMLDivElement;
    const span = div.firstChild as HTMLSpanElement;
    expect(div.childNodes.length).toBe(1);
    expect(span.tagName).toBe("SPAN");
    expect(span.textContent).toBe("good");
  });
});
