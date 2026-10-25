import { describe, expect, test } from "vitest";
import { chartDomain, dataError, donutSlices, funnelLayout, parseCsv, raceRanks, sankeyLayout, showsSample, spread, waterfallSteps, type SankeyLayout } from "../../src/fx/chart";

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

describe("timeline columns by name", () => {
  // end before start in the file, plus an extra number column first: the names decide, not the order.
  const rows = [
    { phase: "A", people: 3, end: 2021, start: 2019 },
    { phase: "B", people: 5, end: 2023, start: 2020 },
  ];
  test("reads start and end by header", () => {
    expect(dataError(rows, "timeline")).toBe("");
    expect(chartDomain(rows, "timeline")).toEqual([2019, 2023]);
  });
  test("takes from and to as well", () => {
    expect(chartDomain([{ p: "A", n: 1, to: 2024, from: 2022 }], "timeline")).toEqual([2022, 2024]);
  });
});

describe("donut", () => {
  const rows = [{ k: "A", n: 50 }, { k: "B", n: 30 }, { k: "C", n: 20 }];
  test("slices share the turn in row order, from 12 o'clock", () => {
    const s = donutSlices([50, 30, 20]);
    expect(s.map((x) => x.share)).toEqual([0.5, 0.3, 0.2]);
    expect(s[0].start).toBe(0);
    expect(s[2].end).toBeCloseTo(1);
    expect(s[1].start).toBe(s[0].end);
  });
  test("good rows: no error; a negative or an all-zero total is an error; more than six slices is an error", () => {
    expect(dataError(rows, "donut")).toBe("");
    expect(dataError([{ k: "A", n: 5 }, { k: "B", n: -1 }], "donut")).toBe("row 2, n below zero");
    expect(dataError([{ k: "A", n: 0 }], "donut")).toBe("the values add up to zero");
    const many = Array.from({ length: 7 }, (_, i) => ({ k: `S${i}`, n: 1 }));
    expect(dataError(many, "donut")).toBe("7 slices; a donut reads up to 6: merge the small ones into Other");
  });
});

describe("slope", () => {
  test("needs a before and an after column", () => {
    expect(dataError([{ k: "A", before: 1 }], "slope")).toBe("needs a before and an after column");
    expect(dataError([{ k: "A", before: 1, after: 2 }], "slope")).toBe("");
  });
  test("its value axis spans the data, not zero", () => {
    expect(chartDomain([{ k: "A", a: 40, b: 60 }, { k: "B", a: 55, b: 45 }], "slope")).toEqual([40, 60]);
  });
  test("spread keeps labels a gap apart, in order, and leaves well-spaced ones alone", () => {
    expect(spread([100, 300, 500], 30)).toEqual([100, 300, 500]);
    const s = spread([100, 105, 110, 400], 30);
    for (let i = 1; i < s.length; i++) expect(s[i] - s[i - 1]).toBeGreaterThanOrEqual(30 - 1e-9);
    expect(s[3]).toBe(400);
    // The bunch stays centred on where it was.
    expect((s[0] + s[1] + s[2]) / 3).toBeCloseTo(105);
  });
});

describe("raceRanks", () => {
  test("ranks by value, largest first; ties keep column order", () => {
    expect(raceRanks([10, 30, 20])).toEqual([2, 0, 1]);
    expect(raceRanks([5, 5, 9])).toEqual([1, 2, 0]);
  });
});

describe("funnel", () => {
  test("widths are shares of the largest stage, conversion is from the stage before", () => {
    expect(funnelLayout([200, 100, 25])).toEqual([
      { share: 1, conversion: null },
      { share: 0.5, conversion: 0.5 },
      { share: 0.125, conversion: 0.25 },
    ]);
  });

  test("a stage after a zero stage has no conversion, never a division by zero", () => {
    expect(funnelLayout([10, 0, 0])).toEqual([
      { share: 1, conversion: null },
      { share: 0, conversion: 0 },
      { share: 0, conversion: null },
    ]);
  });

  test("dataError: no stage below zero, not all zero, up to 8 stages", () => {
    expect(dataError([{ s: "A", n: 5 }, { s: "B", n: 3 }], "funnel")).toBe("");
    expect(dataError([{ s: "A", n: 5 }, { s: "B", n: -1 }], "funnel")).toBe("row 2, n below zero");
    expect(dataError([{ s: "A", n: 0 }], "funnel")).toBe("every stage is zero");
    expect(dataError(Array.from({ length: 9 }, (_, i) => ({ s: String(i), n: 1 })), "funnel")).toBe("9 stages; a funnel reads up to 8");
  });
});

describe("sankey", () => {
  const link = (source: string, target: string, value: number) => ({ source, target, value });
  const laid = (links: ReturnType<typeof link>[], gap = 0) => sankeyLayout(links, gap) as SankeyLayout;

  test("nodes sit in columns by their longest path from a root, in order of first appearance", () => {
    const r = laid([link("A", "B", 4), link("A", "C", 6), link("B", "C", 4), link("C", "D", 10)]);
    expect(r.nodes.map((n) => [n.name, n.depth, n.value])).toEqual([["A", 0, 10], ["B", 1, 4], ["C", 2, 10], ["D", 3, 10]]);
    expect(r.columns).toBe(4);
  });

  test("a band is as thick at both ends, stacked at each node in order without overlap", () => {
    const r = laid([link("A", "X", 3), link("B", "X", 1), link("A", "Y", 1)], 0.1);
    const [aX, bX, aY] = r.links;
    expect(aX.w).toBeCloseTo(aY.w * 3);
    // At A: to X (upper target) first, then to Y.
    expect(aY.sy).toBeCloseTo(aX.sy + aX.w);
    // At X: from A (upper source) first, then from B.
    expect(bX.ty).toBeCloseTo(aX.ty + aX.w);
    const [A, , B] = r.nodes; // in order of first appearance: A, X, B, Y
    expect(B.y0).toBeCloseTo(A.y1 + 0.1);
    // The fullest column fills the height.
    expect(A.y0).toBeCloseTo(0);
    expect(B.y1).toBeCloseTo(1);
  });

  test("the same links give the same layout", () => {
    const links = [link("A", "B", 2), link("A", "C", 3), link("C", "D", 1)];
    expect(sankeyLayout(links, 0.05)).toEqual(sankeyLayout(links, 0.05));
  });

  test("cycles, self-loops and too many nodes or columns are refused", () => {
    expect(sankeyLayout([link("A", "B", 1), link("B", "C", 1), link("C", "B", 1)], 0)).toBe("a cycle through B; a sankey flows one way");
    expect(sankeyLayout([link("A", "A", 1)], 0)).toBe("row 1, A flows into itself");
    const chain = Array.from({ length: 6 }, (_, i) => link(String(i), String(i + 1), 1));
    expect(sankeyLayout(chain, 0)).toBe("7 columns; a sankey reads up to 6");
    const fan = Array.from({ length: 9 }, (_, i) => link("hub", String(i), 1));
    expect(sankeyLayout(fan, 0)).toBe("9 nodes in column 2; a sankey reads up to 8");
    const wide = Array.from({ length: 17 }, (_, i) => link(`s${i}`, `t${i}`, 1));
    expect(sankeyLayout(wide, 0)).toBe("34 nodes; a sankey reads up to 16");
  });

  test("dataError reads source, target and value by position", () => {
    expect(dataError(parseCsv("from,to,users\nAds,2024,5\n"), "sankey")).toBe("");
    expect(dataError([{ from: "A", to: "B" }], "sankey")).toBe("needs source, target and value columns");
    expect(dataError(parseCsv("from,to,users\nA,B,0\n"), "sankey")).toBe("row 1, users not a number above zero");
    expect(dataError(parseCsv("from,to,users\nA,,3\n"), "sankey")).toBe("row 1, no source or target");
    expect(dataError(parseCsv("from,to,users\nA,B,3\nB,A,1\n"), "sankey")).toBe("a cycle through A; a sankey flows one way");
  });
});
