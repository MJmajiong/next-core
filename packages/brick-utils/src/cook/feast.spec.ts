import { feast } from "./feast";
import { prefeast } from "./prefeast";

describe("feast", () => {
  const getGlobalVariables = (): Record<string, any> => ({
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
    },
    APP: {
      homepage: "/hello/world",
    },
  });

  it.each<
    [string, { source: string; cases: { args: unknown[]; result: unknown }[] }]
  >([
    [
      "lexical variables in block statement",
      {
        source: `
          function test(a) {
            {
              let a;
              a = 9;
            }
            return a;
          }
        `,
        cases: [
          {
            args: [1],
            result: 1,
          },
        ],
      },
    ],
    [
      "lexical variables in block statement of if",
      {
        source: `
          function test(a) {
            if (true) {
              let a;
              a = 9;
            }
            return a;
          }
        `,
        cases: [
          {
            args: [1],
            result: 1,
          },
        ],
      },
    ],
    [
      "lexical variables in block statement of switch",
      {
        source: `
          function test(a) {
            switch (true) {
              case true:
                let a;
                a = 9;
            }
            return a;
          }
        `,
        cases: [
          {
            args: [1],
            result: 1,
          },
        ],
      },
    ],
    [
      "update param variables in block statement",
      {
        source: `
          function test(a) {
            {
              a = 9;
            }
            return a;
          }
        `,
        cases: [
          {
            args: [1],
            result: 9,
          },
        ],
      },
    ],
    [
      "update lexical variables in block statement",
      {
        source: `
          function test(a) {
            let b = a;
            {
              b = 9;
            }
            return b;
          }
        `,
        cases: [
          {
            args: [1],
            result: 9,
          },
        ],
      },
    ],
    [
      "switch statements: general",
      {
        source: `
          function test(a) {
            let b;
            switch(a) {
              case 1:
                b = 'A';
                break;
              case 2:
                b = 'B';
                break;
              case 9:
                b = 'X';
                return 'Z';
              default:
                b = 'C';
            }
            return b;
          }
        `,
        cases: [
          {
            args: [1],
            result: "A",
          },
          {
            args: [2],
            result: "B",
          },
          {
            args: [3],
            result: "C",
          },
          {
            args: [9],
            result: "Z",
          },
        ],
      },
    ],
    [
      "switch statements: missing a break",
      {
        source: `
          function test(a) {
            let b = '';
            switch(a) {
              case 1:
                b += 'A';
              case 2:
                b += 'B';
                break;
              default:
                b = 'C';
            }
            return b;
          }
        `,
        cases: [
          {
            args: [1],
            result: "AB",
          },
          {
            args: [2],
            result: "B",
          },
          {
            args: [3],
            result: "C",
          },
        ],
      },
    ],
    [
      "switch statements: missing a break before default",
      {
        source: `
          function test(a) {
            let b = '';
            switch(a) {
              case 1:
                b += 'A';
                break;
              case 2:
                b += 'B';
              default:
                b += 'C';
            }
            return b;
          }
        `,
        cases: [
          {
            args: [1],
            result: "A",
          },
          {
            args: [2],
            result: "BC",
          },
          {
            args: [3],
            result: "C",
          },
        ],
      },
    ],
    [
      "if statements",
      {
        source: `
          function test(a) {
            if (a === 1) {
              return 'A';
            } else if (a === 2) {
              return 'B';
            } else {
              return 'C';
            }
          }
        `,
        cases: [
          {
            args: [1],
            result: "A",
          },
          {
            args: [2],
            result: "B",
          },
          {
            args: [3],
            result: "C",
          },
        ],
      },
    ],
    [
      "object destructuring",
      {
        source: `
          function test(a, { r: d, ...e } = {}, ...f) {
            const { x: b = 9, ...c } = a;
            return {
              b,
              c,
              d,
              e,
              f
            };
          }
        `,
        cases: [
          {
            args: [
              {
                x: 1,
                y: 2,
                z: 3,
              },
              {
                r: 4,
                s: 5,
                t: 6,
              },
              7,
              8,
            ],
            result: {
              b: 1,
              c: {
                y: 2,
                z: 3,
              },
              d: 4,
              e: {
                s: 5,
                t: 6,
              },
              f: [7, 8],
            },
          },
          {
            args: [
              {
                y: 2,
                z: 3,
              },
            ],
            result: {
              b: 9,
              c: {
                y: 2,
                z: 3,
              },
              d: undefined,
              e: {},
              f: [],
            },
          },
        ],
      },
    ],
    [
      "array destructuring",
      {
        source: `
          function test(a, [d, ...e] = []) {
            const [ b = 9, ...c ] = a;
            return [ 0, ...c, b, d, e];
          }
        `,
        cases: [
          {
            args: [
              [1, 2, 3],
              [4, 5, 6],
            ],
            result: [0, 2, 3, 1, 4, [5, 6]],
          },
          {
            args: [[undefined, 2, 3]],
            result: [0, 2, 3, 9, undefined, []],
          },
        ],
      },
    ],
    [
      "recursive",
      {
        source: `
          function test(a) {
            return a + (a > 1 ? test(a - 1) : 0);
          }
        `,
        cases: [
          {
            args: [2],
            result: 3,
          },
          {
            args: [3],
            result: 6,
          },
        ],
      },
    ],
    [
      "var variables overload param variables",
      {
        source: `
          function test(a) {
            var a = 2;
            return a;
          }
        `,
        cases: [
          {
            args: [1],
            result: 2,
          },
        ],
      },
    ],
    [
      "functions overload params variables",
      {
        source: `
          function test(a) {
            function a() {}
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "function",
          },
        ],
      },
    ],
    [
      "var variables hoist in block statements",
      {
        source: `
          function test() {
            var b = typeof a;
            if (false) {
              var a;
            }
            return b;
          }
        `,
        cases: [
          {
            args: [],
            result: "undefined",
          },
        ],
      },
    ],
    [
      "functions after var variables initialized",
      {
        source: `
          function test(a) {
            var a = 'A';
            function a() {}
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "string",
          },
        ],
      },
    ],
    [
      "functions after var variables uninitialized",
      {
        source: `
          function test(a) {
            var a;
            function a() {}
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "function",
          },
        ],
      },
    ],
    [
      "functions before var variables initialized",
      {
        source: `
          function test(a) {
            function a() {}
            var a = 'A';
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "string",
          },
        ],
      },
    ],
    [
      "functions before var variables uninitialized",
      {
        source: `
          function test(a) {
            function a() {}
            var a;
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "function",
          },
        ],
      },
    ],
    [
      "functions before false conditional var variables initialized",
      {
        source: `
          function test(a) {
            function a() {}
            if (false) {
              var a = 'A';
            }
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "function",
          },
        ],
      },
    ],
    [
      "functions before true conditional var variables initialized",
      {
        source: `
          function test(a) {
            function a() {}
            if (true) {
              var a = 'A';
            }
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "string",
          },
        ],
      },
    ],
    [
      "functions before blocked var variables initialized",
      {
        source: `
          function test(a) {
            function a() {}
            {
              var a = 'A';
            }
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "string",
          },
        ],
      },
    ],
    [
      "conditional functions after var variables uninitialized",
      {
        source: `
          function test(a) {
            var a;
            if (false) {
              function a() {}
            }
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "number",
          },
        ],
      },
    ],
    [
      "blocked functions after var variables uninitialized",
      {
        source: `
          function test(a) {
            var a;
            {
              function a() {}
            }
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "number",
          },
        ],
      },
    ],
    [
      "blocked functions after var variables uninitialized with no params",
      {
        source: `
          function test() {
            var a;
            {
              function a() {}
            }
            return typeof a;
          }
        `,
        cases: [
          {
            args: [],
            result: "undefined",
          },
        ],
      },
    ],
    [
      "blocked functions",
      {
        source: `
          function test(a) {
            {
              function a() {}
            }
            return typeof a;
          }
        `,
        cases: [
          {
            args: [1],
            result: "number",
          },
        ],
      },
    ],
    [
      "hoisted functions",
      {
        source: `
          function test() {
            const t = a();
            function a() {
              return 1;
            }
            return t;
          }
        `,
        cases: [
          {
            args: [],
            result: 1,
          },
        ],
      },
    ],
    [
      "functions hoisting in block",
      {
        source: `
          function test() {
            const t = a();
            let r;
            if (true) {
              r = a();
              function a() {
                return 2;
              }
            }
            function a() {
              return 1;
            }
            return t + r;
          }
        `,
        cases: [
          {
            args: [],
            result: 3,
          },
        ],
      },
    ],
    [
      "functions hoisting in switch statement",
      {
        source: `
          function test() {
            const t = a();
            let r;
            switch (true) {
              case true:
                r = a();
              case false:
                function a() { return 2 }
            }
            function a() {
              return 1;
            }
            return t + r;
          }
        `,
        cases: [
          {
            args: [],
            result: 3,
          },
        ],
      },
    ],
    [
      "hoisted functions in function expressions",
      {
        source: `
          function test() {
            const f = function(){
              const t = a();
              let r;
              if (true) {
                r = a();
                function a() {
                  return 2;
                }
              }
              function a() {
                return 1;
              }
              return t + r;
            };
            return f();
          }
        `,
        cases: [
          {
            args: [],
            result: 3,
          },
        ],
      },
    ],
    [
      "hoisted functions in arrow functions",
      {
        source: `
          function test() {
            const f = () => {
              const t = a();
              let r;
              if (true) {
                r = a();
                function a() {
                  return 2;
                }
              }
              function a() {
                return 1;
              }
              return t + r;
            };
            return f();
          }
        `,
        cases: [
          {
            args: [],
            result: 3,
          },
        ],
      },
    ],
    [
      "for const ... of",
      {
        source: `
          function test() {
            let total = 0;
            for (const i of [1, 2]) {
              total += i;
            }
            return total;
          }
        `,
        cases: [
          {
            args: [],
            result: 3,
          },
        ],
      },
    ],
    [
      "for var ... of",
      {
        source: `
          function test() {
            let total = 0;
            for (var i of [1, 2]) {
              total += i;
            }
            return total + i;
          }
        `,
        cases: [
          {
            args: [],
            result: 5,
          },
        ],
      },
    ],
    [
      "for let ... of and break",
      {
        source: `
          function test() {
            let total = 0;
            for (let i of [1, 2]) {
              total += i;
              if (total >= 1) {
                break;
                // Should never reach here.
                total += 10;
              }
            }
            return total;
          }
        `,
        cases: [
          {
            args: [],
            result: 1,
          },
        ],
      },
    ],
    [
      "for let ... in",
      {
        source: `
          function test() {
            let total = '';
            for (let i in {a:1,b:2}) {
              total += i;
            }
            return total;
          }
        `,
        cases: [
          {
            args: [],
            result: "ab",
          },
        ],
      },
    ],
    [
      "for var ... in",
      {
        source: `
          function test() {
            let total = '';
            for (var i in {a:1,b:2}) {
              total += i;
            }
            return total + i;
          }
        `,
        cases: [
          {
            args: [],
            result: "abb",
          },
        ],
      },
    ],
    [
      "for const ... in and return",
      {
        source: `
          function test() {
            let total = '';
            for (let i in {a:1,b:2}) {
              total += i;
              if (total.length >= 1) {
                return 'oops: ' + total;
              }
            }
            return total;
          }
        `,
        cases: [
          {
            args: [],
            result: "oops: a",
          },
        ],
      },
    ],
    [
      "for let ...",
      {
        source: `
          function test() {
            let total = 0;
            const list = [1, 2];
            for (let i = 0; i < list.length; i += 1) {
              total += list[i];
            }
            return total;
          }
        `,
        cases: [
          {
            args: [],
            result: 3,
          },
        ],
      },
    ],
    [
      "for var ... and break",
      {
        source: `
          function test() {
            let total = 0;
            const list = [1, 2];
            for (var i = 0; i < list.length; i += 1) {
              total += list[i];
              if (total >= 1) {
                break;
              }
            }
            return total + i;
          }
        `,
        cases: [
          {
            args: [],
            result: 1,
          },
        ],
      },
    ],
    [
      "nested for ...",
      {
        source: `
          function test() {
            let total = 0;
            const list = [1, 2];
            const object = {a: 3, b: 4};
            for (const i of list) {
              total += i;
              for (const k in object) {
                total += object[k];
              }
            }
            return total;
          }
        `,
        cases: [
          {
            args: [],
            result: 17,
          },
        ],
      },
    ],
    [
      "nested for ... and break inner",
      {
        source: `
          function test() {
            let total = 0;
            const list = [1, 2];
            const object = {a: 3, b: 4};
            for (const i of list) {
              total += i;
              for (const k in object) {
                total += object[k];
                break;
              }
            }
            return total;
          }
        `,
        cases: [
          {
            args: [],
            result: 9,
          },
        ],
      },
    ],
    [
      "nested for ... and break outer",
      {
        source: `
          function test() {
            let total = 0;
            const list = [1, 2];
            const object = {a: 3, b: 4};
            for (const i of list) {
              total += i;
              for (const k in object) {
                total += object[k];
              }
              break;
            }
            return total;
          }
        `,
        cases: [
          {
            args: [],
            result: 8,
          },
        ],
      },
    ],
    [
      "nested for ... and return inner",
      {
        source: `
          function test() {
            let total = 0;
            const list = [1, 2];
            const object = {a: 3, b: 4};
            for (const i of list) {
              total += i;
              for (const k in object) {
                total += object[k];
                return "oops: " + total;
              }
              alert('yaks');
            }
            return total;
          }
        `,
        cases: [
          {
            args: [],
            result: "oops: 4",
          },
        ],
      },
    ],
    [
      "try ... catch ... finally",
      {
        source: `
          function test() {
            let a = 1, b, c;
            try {
              b = 'yep';
              a();
              b = 'nope';
            } catch (e) {
              a = e.toString();
            } finally {
              c = a + ':' + b;
            }
            return c;
          }
        `,
        cases: [
          {
            args: [],
            result: "TypeError: a is not a function:yep",
          },
        ],
      },
    ],
  ])("%s", (desc, { source, cases }) => {
    const func = feast(prefeast(source), getGlobalVariables()) as (
      ...args: unknown[]
    ) => unknown;
    for (const { args, result } of cases) {
      const equivalentFunc = new Function(`"use strict"; return (${source})`)();
      expect(equivalentFunc(...args)).toEqual(result);
      expect(func(...args)).toEqual(result);
    }
  });

  it.each<[desc: string, source: string, inputs: unknown[][]]>([
    [
      "assign constants",
      `
        function test(){
          const a = 1;
          a = 2;
        }
      `,
      [[]],
    ],
    [
      "assign global functions",
      `
        function test(){
          test = 1;
        }
      `,
      [[]],
    ],
    [
      "assign function expressions",
      `
        function test(){
          (function f(){
            f = 1;
          })();
        }
      `,
      [[]],
    ],
    [
      "assign for const ... of",
      `
        function test(){
          for (const i of [1]) {
            i = 2;
          }
        }
      `,
      [[]],
    ],
    [
      "assign for const ...",
      `
        function test(){
          for (const i=0; i<2; i+=1) {
            i = 2;
          }
        }
      `,
      [[]],
    ],
  ])("%s should throw", (desc, source, inputs) => {
    const func = feast(prefeast(source), getGlobalVariables()) as (
      ...args: unknown[]
    ) => unknown;
    for (const args of inputs) {
      const equivalentFunc = new Function(`"use strict"; return (${source})`)();
      expect(() => equivalentFunc(...args)).toThrowError();
      expect(() => func(...args)).toThrowErrorMatchingSnapshot();
    }
  });
});
