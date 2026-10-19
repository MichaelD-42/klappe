import { describe, expect, test } from "vitest";
import { chartDomain, dataError, parseCsv, showsSample, waterfallSteps } from "../../src/fx/chart";

describe("parseCsv", () => {
  test("reads a header row, numbers and trimmed values", () => {
    expect(parseCsv("name, value ,share\n North , 12 , 0.5\nSouth,-3,x\n")).toEqual([
      { name: "North", value: 12, share: 0.5 },
      { name: "South", value: -3, share: "x" },
    ]);
  });

  test("skips blank lines and # comment lines, accepts CRLF", () => {
    const rows = parseCsv("# source: klappe demo sample\r\nq,v\r\n\r\nQ1,1\r\n# source: not this\r\nQ2,2\r\n");
    expect([...rows]).toEqual([
      { q: "Q1", v: 1 },
      { q: "Q2", v: 2 },
    ]);
    expect(rows.source).toBe("klappe demo sample");
  });

  test("no source line: no source", () => {
    expect(parseCsv("# a note\nq,v\nQ1,1\n").source).toBeUndefined();
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

describe("dataError", () => {
  test("good rows: no error", () => {
    expect(dataError(rows, "bar")).toBe("");
    expect(dataError(rows, "stacked")).toBe("");
  });

  test("a bad cell in a number column is an error, not a dropped column", () => {
    const bad = parseCsv("q,units,cost\nQ1,5,3\nQ2,n/a,4\nQ3,7,5\n");
    expect(dataError(bad, "bar")).toBe("row 2, column units not a number");
    expect(dataError(parseCsv("q,units\nQ1,5\nQ2,\n"), "bar")).toBe("row 2, column units not a number");
  });

  test("a column with one number in three rows is a bad series, not text", () => {
    const bad = parseCsv("q,units,cost\nQ1,5,3\nQ2,n/a,4\nQ3,oops,5\n");
    expect(dataError(bad, "bar")).toBe("row 2, column units not a number");
    expect(dataError(bad, "stacked")).toBe("row 2, column units not a number");
    expect(dataError(parseCsv("q,units\nQ1,n/a\nQ2,n/a\nQ3,7\n"), "line")).toBe("row 1, column units not a number");
  });

  test("a text column is not a series", () => {
    expect(dataError(parseCsv("q,note,units\nQ1,ok,5\nQ2,late,6\n"), "bar")).toBe("");
    expect(dataError(parseCsv("q,note\nQ1,ok\n"), "bar")).toBe("no number column");
  });

  test("null, arrays and numbers are not rows", () => {
    expect(dataError([{ q: "a", v: 1 }, null], "bar")).toBe("row 2 is not an object");
    expect(dataError([[1, 2]], "bar")).toBe("row 1 is not an object");
    expect(dataError([3], "line")).toBe("row 1 is not an object");
  });

  test("timeline: needs two number columns and an end not before its start", () => {
    expect(dataError([{ t: "a", start: 1 }], "timeline")).toBe("needs a start and an end column");
    expect(dataError([{ t: "a", start: 2020, end: 2019 }], "timeline")).toBe("row 1, end before start");
    expect(dataError([{ t: "a", start: 2019, end: 2019 }], "timeline")).toBe("");
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

describe("showsSample", () => {
  test("shows the Sample data label when asked or when the source has the demo marker", () => {
    expect(showsSample(true, undefined)).toBe(true);
    expect(showsSample(undefined, "klappe demo SAMPLE")).toBe(true);
    expect(showsSample(false, "Sample survey 2025")).toBe(false);
    expect(showsSample(undefined, "ERP export 2025-09")).toBe(false);
    expect(showsSample(undefined, undefined)).toBe(false);
  });
});
