import { assembleDeck } from "../assemble";
import { chart, type ChartHandle, type ChartOpts } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// One scene per chart type, each step adder as its own step; one missing dataset (DATA MISSING), one bad
// cell and one JSON null (DATA ERROR), the fixture's only problems; one plain-Markdown chart link in the default
// media slot; a donut, a slope, a funnel with a zero stage, and a sankey whose highlight adders are made out of
// step order (row 2 made first, lit last); then one scene per step-by-step adder: highlight on a bar chart, series
// on a line, slice on a donut, bar on a stacked chart and a funnel; reference lines on a bar chart and a timeline.
// All numbers are made-up sample data. Each bar from the handle's bars carries its index as data-bar.
const rect = { x: 160, y: 120, w: 1600, h: 840 };
const scene = (opts: Omit<ChartOpts, "rect">): SceneModule => ({
  build: (ctx) => {
    const c = chart(ctx, { rect, ...opts });
    c.bars.forEach((b, i) => b.setAttribute("data-bar", String(i)));
    return c;
  },
  steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
});
const md = (title: string) => `## ${title}\n\n- Axes.\n- Grow.\n- Values.\n`;
// A scene whose steps are the given adders, one each, with a scene.md of as many steps.
const stepped = (opts: Omit<ChartOpts, "rect">, steps: ((c: ChartHandle) => StepAdder)[]): SceneModule => ({
  build: (ctx) => {
    const c = chart(ctx, { rect, ...opts });
    c.bars.forEach((b, i) => b.setAttribute("data-bar", String(i)));
    return c;
  },
  steps: steps.map((s) => (tl, c: ChartHandle) => s(c)(tl)),
});
const steps = (title: string, n: number) => `## ${title}\n\n${"- Step.\n".repeat(n)}`;
const axes = (c: ChartHandle): StepAdder => (tl) => c.axes(tl);

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Charts\n",
      "sections/10-a/10-bar/scene.md": md("Bar"),
      "sections/10-a/20-stacked/scene.md": md("Stacked"),
      "sections/10-a/30-line/scene.md": md("Line"),
      "sections/10-a/40-waterfall/scene.md": md("Waterfall"),
      "sections/10-a/50-timeline/scene.md": md("Timeline"),
      "sections/10-a/60-missing/scene.md": md("Missing"),
      "sections/10-a/70-slot/scene.md": "## Slot\n\n- Text beside the chart.\n- [Units by quarter](data/quarters.csv)\n",
      "sections/10-a/80-bad/scene.md": md("Bad cell"),
      "sections/10-a/90-null/scene.md": md("Null JSON"),
      "sections/10-a/92-donut/scene.md": md("Donut"),
      "sections/10-a/94-slope/scene.md": md("Slope"),
      "sections/10-a/96-funnel/scene.md": md("Funnel"),
      "sections/10-a/98-sankey/scene.md": md("Sankey") + "- Light row 1.\n- Light row 3.\n",
      "sections/10-a/101-lit-bar/scene.md": steps("Lit bar", 5),
      "sections/10-a/102-series/scene.md": steps("Series", 4),
      "sections/10-a/103-slice/scene.md": steps("Slice", 5),
      "sections/10-a/104-stack-steps/scene.md": steps("Stack steps", 3),
      "sections/10-a/105-funnel-steps/scene.md": steps("Funnel steps", 3),
      "sections/10-a/106-target/scene.md": md("Target"),
      "sections/10-a/107-today/scene.md": md("Today"),
    },
    {
      "sections/10-a/10-bar/scene.ts": scene({ src: "data/quarters.csv", title: "Units by quarter", sample: true }),
      "sections/10-a/20-stacked/scene.ts": scene({ src: "data/mix.json", type: "stacked", title: "Units by product", sample: true }),
      "sections/10-a/30-line/scene.ts": scene({ src: "data/trend.csv", type: "line", title: "Margin by month, %", sample: true }),
      "sections/10-a/40-waterfall/scene.ts": scene({ src: "data/bridge.csv", type: "waterfall", title: "Cost bridge", sample: true }),
      "sections/10-a/50-timeline/scene.ts": scene({
        src: "data/plan.csv",
        type: "timeline",
        title: "Project phases",
        data: [
          { phase: "Concept", from: 2019, to: 2021 },
          { phase: "Prototype", from: 2020, to: 2023 },
          { phase: "Series", from: 2023, to: 2026 },
        ],
      }),
      "sections/10-a/60-missing/scene.ts": scene({ src: "data/missing.csv", title: "Never drawn" }),
      "sections/10-a/80-bad/scene.ts": scene({ src: "data/bad.csv", title: "Never drawn" }),
      "sections/10-a/90-null/scene.ts": scene({ src: "data/null.json", title: "Never drawn" }),
      "sections/10-a/92-donut/scene.ts": scene({ src: "data/share.csv", type: "donut", title: "Hours by activity", sample: true }),
      "sections/10-a/94-slope/scene.ts": scene({ src: "data/change.csv", type: "slope", title: "Lead time, days", sample: true }),
      "sections/10-a/96-funnel/scene.ts": scene({ src: "data/stages.csv", type: "funnel", title: "Sign-up funnel" }),
      "sections/10-a/98-sankey/scene.ts": {
        build: (ctx) => {
          const c = chart(ctx, { rect, src: "data/flow.csv", type: "sankey", title: "Where visitors go" });
          c.bars.forEach((b, i) => b.setAttribute("data-bar", String(i)));
          return { c, later: c.highlight(2), first: c.highlight(0) };
        },
        steps: [
          (tl, x: { c: ChartHandle }) => x.c.axes(tl),
          (tl, x: { c: ChartHandle }) => x.c.grow(tl),
          (tl, x: { c: ChartHandle }) => x.c.values(tl),
          (tl, x: { first: StepAdder }) => x.first(tl),
          (tl, x: { later: StepAdder }) => x.later(tl),
        ],
      } satisfies SceneModule,
      "sections/10-a/101-lit-bar/scene.ts": stepped({ src: "data/quarters.csv", title: "Units by quarter" }, [
        axes,
        (c) => (tl) => c.grow(tl),
        (c) => (tl) => c.values(tl),
        (c) => c.highlight(2),
        (c) => c.highlight(null),
      ]),
      "sections/10-a/102-series/scene.ts": stepped({ src: "data/trend.csv", type: "line", title: "Margin by month, %" }, [
        axes,
        (c) => c.series(0),
        (c) => c.series(1),
        (c) => c.highlight(1),
      ]),
      "sections/10-a/103-slice/scene.ts": stepped({ src: "data/share.csv", type: "donut", title: "Hours by activity" }, [
        axes,
        (c) => c.slice(0),
        (c) => c.slice(1),
        (c) => c.slice(2),
        (c) => c.slice(3),
      ]),
      "sections/10-a/104-stack-steps/scene.ts": stepped({ src: "data/mix.json", type: "stacked", title: "Units by product" }, [
        axes,
        (c) => c.bar(1),
        (c) => c.highlight(1),
      ]),
      "sections/10-a/105-funnel-steps/scene.ts": stepped({ src: "data/stages.csv", type: "funnel", title: "Sign-up funnel" }, [
        axes,
        (c) => c.bar(0),
        (c) => c.bar(1),
      ]),
      // The goal is above every bar: the value axis must reach it.
      "sections/10-a/106-target/scene.ts": scene({ src: "data/quarters.csv", title: "Units by quarter", lines: [{ value: 300, label: "Goal" }] }),
      "sections/10-a/107-today/scene.ts": scene({
        src: "data/plan.csv",
        type: "timeline",
        title: "Project phases",
        data: [
          { phase: "Concept", from: 2019, to: 2021 },
          { phase: "Series", from: 2023, to: 2026 },
        ],
        lines: [{ value: 2024, label: "Today" }],
      }),
    },
  );
  r.deck.files = {
    data: {
      "data/quarters.csv": "# source: klappe demo sample\nquarter,units\nQ1,120\nQ2,185\nQ3,-40\nQ4,240\n",
      "data/bad.csv": "quarter,units\nQ1,5\nQ2,n/a\nQ3,7\n",
      "data/null.json": "null",
      "data/mix.json": JSON.stringify({
        source: "klappe demo sample",
        rows: [
          { quarter: "Q1", alpha: 40, beta: 25, gamma: 10 },
          { quarter: "Q2", alpha: 55, beta: 30, gamma: 20 },
          { quarter: "Q3", alpha: 35, beta: -15, gamma: 30 },
          { quarter: "Q4", alpha: 70, beta: 45, gamma: 25 },
        ],
      }),
      "data/trend.csv": "month,north,south\nJan,4.5,2.0\nFeb,5.2,-1.5\nMar,6.8,1.0\nApr,6.1,3.5\nMay,7.4,4.2\n",
      "data/bridge.csv": "step,delta\nStart,100\nMaterial,-25\nLabour,15\nScrap,-30\nPrice,20\n",
      "data/share.csv": "# source: klappe demo sample\nactivity,hours\nBuild,50\nReview,20\nWait,25\nRework,5\n",
      // Three rows end within a day of each other: their right-hand labels must be spread apart.
      "data/change.csv": "# source: klappe demo sample\nteam,before,after\nNorth,30,12\nSouth,22,13\nEast,15,12.5\nWest,9,18\n",
      // Trial to Paid converts at 0 %; Paid to Renew has no conversion.
      "data/stages.csv": "# source: klappe demo sample\nstage,people\nVisit,1000\nSignup,400\nTrial,100\nPaid,0\nRenew,0\n",
      "data/flow.csv": "# source: klappe demo sample\nfrom,to,users\nAds,Signup,40\nSearch,Signup,30\nSearch,Bounce,20\nSignup,Paid,25\nSignup,Churn,45\n",
    },
    media: {},
  };
  return r;
};
