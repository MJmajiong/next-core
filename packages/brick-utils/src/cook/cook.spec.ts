import { install, InstalledClock } from "lolex";
import { SimpleFunction } from "@next-core/brick-types";
import { cloneDeep } from "lodash";
import { precook } from "./precook";
import { cook } from "./cook";
import {
  positiveCases,
  negativeCases,
  selectiveNegativeCases,
} from "./test-cases";
import { parseAsEstree, parseAsEstreeExpression } from "./parse";
import { supply } from "./supply";
import { NormalizedCase } from "./test-cases/interfaces";
import { casesOfExpressionOnly } from "./test-cases/expressions";
import {
  negativeCasesOfExpressionOnly,
  selectiveNegativeCasesOfExpressionOnly,
} from "./test-cases/negative/expressions";
import { precookFunction, preevaluate } from ".";

jest.spyOn(console, "warn").mockImplementation(() => void 0);

const getExtraGlobalVariables = (): Record<string, unknown> => ({
  DATA: {
    for: "good",
    null: null,
    undefined: undefined,
    true: true,
    false: false,
    number5: 5,
    objectA: {
      onlyInA: 1,
      bothInAB: 2,
    },
    objectB: {
      onlyInB: 3,
      bothInAB: 4,
    },
    q: "a&b",
    redirect: "/r/s?t=u&v=w",
    path: "x/y.zip",
    fnReturnThisFor() {
      return (this as any).for;
    },
  },
  APP: {
    homepage: "/hello/world",
  },
});

const equivalentFunc = (
  source: string,
  attemptToVisitGlobals: Set<string>
): SimpleFunction => {
  const globalVariables = supply(
    attemptToVisitGlobals,
    getExtraGlobalVariables()
  );
  return new Function(
    ...Object.keys(globalVariables),
    `"use strict"; return (${source})`
  )(...Object.values(globalVariables));
};

const containsExperimental = (source: string): boolean => source.includes("|>");

describe("evaluate", () => {
  let clock: InstalledClock;
  beforeEach(() => {
    clock = install({ now: +new Date("2020-03-25 17:37:00") });
  });
  afterEach(() => {
    clock.uninstall();
  });

  it
    // .only
    .each<NormalizedCase>(
      positiveCases
      // .filter(item => item[0] ===
      //   // "array destructuring"
      //   // "iterator destructuring assignment"
      //   // "expression: TAG_URL`${APP.homepage}/list?q=${DATA.q}&redirect=${DATA.redirect}`"
      //   "expression: new Array(1, ...[2, 3])"
      // )
    )("%s", (desc, { source, cases }) => {
    const typescript = desc.startsWith("[TypeScript]");
    const { function: funcAst, attemptToVisitGlobals } = precookFunction(
      source,
      { typescript }
    );
    const globalVariables = supply(
      attemptToVisitGlobals,
      getExtraGlobalVariables()
    );
    const func = cook(funcAst, source, { globalVariables }) as SimpleFunction;
    for (const { args, result } of cases) {
      if (!typescript) {
        expect(
          equivalentFunc(source, attemptToVisitGlobals)(...cloneDeep(args))
        ).toEqual(result);
      }
      expect(func(...cloneDeep(args))).toEqual(result);
    }
  });

  it.each<[string, unknown]>(casesOfExpressionOnly)(
    "expression-only: %s",
    (source, result) => {
      const { expression: exprAst, attemptToVisitGlobals } =
        preevaluate(source);
      const globalVariables = supply(
        attemptToVisitGlobals,
        getExtraGlobalVariables()
      );
      const received = cook(exprAst, source, {
        globalVariables,
      }) as SimpleFunction;
      if (!/\|>/.test(source)) {
        expect(equivalentFunc(source, attemptToVisitGlobals)).toEqual(result);
      }
      expect(received).toEqual(result);
    }
  );

  it.each<NormalizedCase>(negativeCases)(
    "should throw: %s",
    (desc, { source, cases }) => {
      const typescript = desc.startsWith("[TypeScript]");
      const { function: funcAst, attemptToVisitGlobals } = precookFunction(
        source,
        { typescript }
      );
      const globalVariables = supply(
        attemptToVisitGlobals,
        getExtraGlobalVariables()
      );
      const func = cook(funcAst, source, { globalVariables }) as SimpleFunction;
      for (const { args } of cases) {
        if (!typescript && !containsExperimental(source)) {
          expect(() =>
            equivalentFunc(source, attemptToVisitGlobals)(...cloneDeep(args))
          ).toThrowError();
        }
        expect(() => func(...cloneDeep(args))).toThrowErrorMatchingSnapshot();
      }
    }
  );

  it.each<NormalizedCase>(selectiveNegativeCases)(
    "should throw [selective]: %s",
    (desc, { source, cases }) => {
      const typescript = desc.startsWith("[TypeScript]");
      for (const { args } of cases) {
        expect(() => {
          const { function: funcAst, attemptToVisitGlobals } = precookFunction(
            source,
            { typescript }
          );
          const globalVariables = supply(
            attemptToVisitGlobals,
            getExtraGlobalVariables()
          );
          const func = cook(funcAst, source, {
            globalVariables,
          }) as SimpleFunction;
          func(...cloneDeep(args));
        }).toThrowErrorMatchingSnapshot();
      }
    }
  );

  it("should throw if restrict no war usage", () => {
    const source = `
      function test() {
        var a = 1;
        return a;
      }
    `;
    expect(() => equivalentFunc(source, new Set())).not.toThrowError();
    const { function: funcAst, attemptToVisitGlobals } =
      precookFunction(source);
    const globalVariables = supply(
      attemptToVisitGlobals,
      getExtraGlobalVariables()
    );
    expect(() => {
      const func = cook(funcAst, source, {
        globalVariables,
        rules: { noVar: true },
      }) as SimpleFunction;
      func();
    }).toThrowErrorMatchingSnapshot();
  });

  it.each<string>(negativeCasesOfExpressionOnly)(
    "should throw: expression-only: %s",
    (source) => {
      const { expression: exprAst, attemptToVisitGlobals } =
        preevaluate(source);
      const globalVariables = supply(
        attemptToVisitGlobals,
        getExtraGlobalVariables()
      );
      if (!containsExperimental(source)) {
        expect(() =>
          equivalentFunc(source, attemptToVisitGlobals)
        ).toThrowError();
      }
      expect(() =>
        cook(exprAst, source, { globalVariables })
      ).toThrowErrorMatchingSnapshot();
    }
  );

  it.each<string>(selectiveNegativeCasesOfExpressionOnly)(
    "should throw [selective]: expression-only: %s",
    (source) => {
      const { expression: exprAst, attemptToVisitGlobals } =
        preevaluate(source);
      const globalVariables = supply(
        attemptToVisitGlobals,
        getExtraGlobalVariables()
      );
      expect(() =>
        cook(exprAst, source, { globalVariables })
      ).toThrowErrorMatchingSnapshot();
    }
  );
});
