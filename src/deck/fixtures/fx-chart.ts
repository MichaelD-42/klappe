import { assembleDeck } from "../assemble";
import { chart, type ChartOpts } from "klappe/fx";
import type { SceneModule } from "../../types";

// One scene per chart type, each step adder as its own step; one missing dataset (DATA MISSING), one bad
// cell and one JSON null (DATA ERROR), the fixture's only problems; one plain-Markdown chart link in the default
// media slot; a donut and a slope chart.
// All numbers are made-up sample data.
const rect = { x: 160, y: 120, w: 1600, h: 840 };
const scene = (opts: Omit<ChartOpts, "rect">): SceneModule => ({
  build: (ctx) => chart(ctx, { rect, ...opts }),
  steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
});
const md = (title: string) => `## ${title}\n\n- Axes.\n- Grow.\n- Values.\n`;

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
    },
    media: {},
  };
  return r;
};
