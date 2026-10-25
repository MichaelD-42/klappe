import { chart, type ChartHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("chart() then c.bar(i) — one bar and its value per step", {
  build: (ctx) => chart(ctx, { src: "data/chart-bar.csv", type: "bar", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Units by quarter" }),
  steps: [
    (tl, c: ChartHandle) => c.axes(tl),
    (tl, c: ChartHandle) => c.bar(0)(tl),
    (tl, c: ChartHandle) => c.bar(1)(tl),
    (tl, c: ChartHandle) => c.bar(2)(tl),
    (tl, c: ChartHandle) => c.bar(3)(tl),
  ],
});
