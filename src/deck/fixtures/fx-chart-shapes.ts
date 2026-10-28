import { assembleDeck } from "../assemble";
import { chart, type ChartHandle, type ChartOpts } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// Radar, heatmap and treemap, each step adder as its own step: a radar with two series, then one series by
// series(0) with its values; a heatmap with cell() moving out of step order and highlight(); a treemap of one
// level and one with groups, tile by tile, then values (which must keep the tiles' values that bar() counted). All numbers are made-up sample data. No problems.
const rect = { x: 160, y: 120, w: 1600, h: 840 };
const stepped = (opts: Omit<ChartOpts, "rect">, steps: ((c: ChartHandle) => StepAdder)[]): SceneModule => ({
  build: (ctx) => chart(ctx, { rect, ...opts }),
  steps: steps.map((s) => (tl, c: ChartHandle) => s(c)(tl)),
});
const md = (title: string, n: number) => `## ${title}\n\n${"- Step.\n".repeat(n)}`;
const axes = (c: ChartHandle): StepAdder => (tl) => c.axes(tl);
const grow = (c: ChartHandle): StepAdder => (tl) => c.grow(tl);
const values = (c: ChartHandle): StepAdder => (tl) => c.values(tl);

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Charts\n",
      "sections/10-a/10-radar/scene.md": md("Radar", 4),
      "sections/10-a/20-radar-one/scene.md": md("Radar, one series", 3),
      "sections/10-a/30-heat/scene.md": md("Heatmap", 7),
      "sections/10-a/40-tiles/scene.md": md("Treemap", 3),
      "sections/10-a/50-grouped/scene.md": md("Treemap with groups", 5),
    },
    {
      "sections/10-a/10-radar/scene.ts": stepped({ src: "data/skills.csv", type: "radar" }, [axes, grow, values, (c) => c.highlight(1)]),
      "sections/10-a/20-radar-one/scene.ts": stepped({ src: "data/profile.csv", type: "radar" }, [axes, (c) => c.series(0), (c) => c.highlight(0)]),
      "sections/10-a/30-heat/scene.ts": stepped({ src: "data/load.csv", type: "heatmap" }, [
        axes,
        grow,
        values,
        (c) => c.cell(1, 2),
        (c) => c.cell(3, 0),
        (c) => c.cell(null),
        (c) => c.highlight(2),
      ]),
      "sections/10-a/40-tiles/scene.ts": stepped({ src: "data/spend.csv", type: "treemap" }, [axes, grow, values]),
      "sections/10-a/50-grouped/scene.ts": stepped({ src: "data/people.csv", type: "treemap" }, [axes, (c) => c.bar(0), (c) => c.bar(3), grow, values]),
    },
  );
  r.deck.files = {
    data: {
      "data/skills.csv": "# source: klappe demo sample\nskill,Ana,Ben\nSpeed,8,5\nQuality,6,9\nScope,7,4\nCost,4,7\nRisk,5,6\n",
      "data/profile.csv": "# source: klappe demo sample\ndimension,score\nReach,3\nDepth,5\nFit,4\nPrice,2\n",
      "data/load.csv": "# source: klappe demo sample\nday,8h,10h,12h,14h,16h\nMon,2,8,9,6,3\nTue,3,9,12,7,2\nWed,1,6,7,5,4\nThu,4,10,14,9,5\nFri,2,5,4,3,1\n",
      "data/spend.csv": "# source: klappe demo sample\nitem,euros\nCloud,40\nLicences,25\nPeople,120\nTravel,10\nTraining,15\nHardware,30\nOffice,20\nOther,5\n",
      "data/people.csv": "# source: klappe demo sample\narea,team,people\nProduct,Web,12\nProduct,Mobile,8\nProduct,Design,5\nPlatform,Infra,10\nPlatform,Data,7\nSales,Field,9\nSales,Inside,4\n",
    },
    media: {},
  };
  return r;
};
