import { chart, type ChartHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("chart() then c.series(i) and c.highlight(i) — one line per step, then one lit", {
  build: (ctx) => chart(ctx, { src: "data/chart-line.csv", type: "line", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Value by month" }),
  steps: [
    (tl, c: ChartHandle) => c.axes(tl),
    (tl, c: ChartHandle) => c.series(0)(tl),
    (tl, c: ChartHandle) => c.series(1)(tl),
    (tl, c: ChartHandle) => c.highlight(1)(tl),
    (tl, c: ChartHandle) => c.highlight(null)(tl),
  ],
});
