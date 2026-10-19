import { describe, expect, test } from "vitest";
import { chartDomain, parseCsv, waterfallSteps } from "../../src/fx/chart";

describe("parseCsv", () => {
  test("reads a header row, numbers and trimmed values", () => {
    expect(parseCsv("name, value ,share\n North , 12 , 0.5\nSouth,-3,x\n")).toEqual([
      { name: "North", value: 12, share: 0.5 },
      { name: "South", value: -3, share: "x" },
    ]);
  });

  test("skips blank lines and # comment lines, accepts CRLF", () => {
    expect(parseCsv("# source: klappe demo sample\r\nq,v\r\n\r\nQ1,1\r\n# note\r\nQ2,2\r\n")).toEqual([
      { q: "Q1", v: 1 },
      { q: "Q2", v: 2 },
    ]);
  });

  test("an empty cell stays an empty string, a missing cell too", () => {
    expect(parseCsv("a,b,c\nx,,3\ny,2")).toEqual([
      { a: "x", b: "", c: 3 },
      { a: "y", b: 2, c: "" },
    ]);
  });

  test("no rows: header only or empty text", () => {
    expect(parseCsv("a,b\n")).toEqual([]);
    expect(parseCsv("")).toEqual([]);
  });
});

const rows = [
  { q: "Q1", a: 4, b: 2 },
  { q: "Q2", a: -1, b: 3 },
  { q: "Q3", a: 6, b: 1 },
];

describe("chartDomain", () => {
  test("bar: the first series, always including zero", () => {
    expect(chartDomain(rows, "bar")).toEqual([-1, 6]);
    expect(chartDomain([{ q: "x", a: 5 }], "bar")).toEqual([0, 5]);
  });

  test("stacked: positive sums up, negative sums down", () => {
    expect(chartDomain(rows, "stacked")).toEqual([-1, 7]);
  });

  test("line: every series, including zero", () => {
    expect(chartDomain(rows, "line")).toEqual([-1, 6]);
    expect(chartDomain([{ q: "x", a: 5, b: 9 }], "line")).toEqual([0, 9]);
  });

  test("waterfall: the running total, including zero", () => {
    expect(chartDomain(rows, "waterfall")).toEqual([0, 9]);
    expect(chartDomain([{ q: "x", a: -5 }, { q: "y", a: 2 }], "waterfall")).toEqual([-5, 0]);
  });

  test("timeline: earliest start to latest end", () => {
    const t = [
      { task: "Plan", start: 2019, end: 2021 },
      { task: "Build", start: 2020, end: 2024 },
    ];
    expect(chartDomain(t, "timeline")).toEqual([2019, 2024]);
  });
});

describe("waterfallSteps", () => {
  test("each bar runs from the running total before it to the one after it", () => {
    expect(waterfallSteps([10, -4, 6, -15])).toEqual([
      [0, 10],
      [10, 6],
      [6, 12],
      [12, -3],
    ]);
  });
});
