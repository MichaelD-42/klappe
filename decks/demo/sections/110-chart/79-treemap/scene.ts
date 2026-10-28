import { chart, type ChartHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('chart({ type: "treemap" }) — shares of a whole in groups; c.bar(i) grows one tile', {
  build: (ctx) => chart(ctx, { src: "data/chart-treemap.csv", type: "treemap", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "People by team" }),
  steps: [
    (tl, c: ChartHandle) => c.axes(tl),
    (tl, c: ChartHandle) => c.bar(0)(tl),
    (tl, c: ChartHandle) => c.grow(tl),
    (tl, c: ChartHandle) => c.values(tl),
  ],
});
