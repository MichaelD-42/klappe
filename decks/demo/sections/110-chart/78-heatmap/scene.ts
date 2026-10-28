import { chart, type ChartHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('chart({ type: "heatmap" }) — cells shaded by value; c.cell(row, col) points at one', {
  build: (ctx) => chart(ctx, { src: "data/chart-heatmap.csv", type: "heatmap", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Support tickets by day and hour" }),
  steps: [
    (tl, c: ChartHandle) => c.axes(tl),
    (tl, c: ChartHandle) => c.grow(tl),
    (tl, c: ChartHandle) => c.values(tl),
    (tl, c: ChartHandle) => c.cell(3, 2)(tl),
    (tl, c: ChartHandle) => (c.cell(null)(tl), c.highlight(4)(tl)),
  ],
});
