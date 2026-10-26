import { chart, type ChartHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("chart({ type: \"donut\" }) then c.slice(i) — one slice per step; the total counts on", {
  build: (ctx) => chart(ctx, { src: "data/chart-donut.csv", type: "donut", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Hours by activity" }),
  steps: [
    (tl, c: ChartHandle) => c.axes(tl),
    (tl, c: ChartHandle) => c.slice(0)(tl),
    (tl, c: ChartHandle) => c.slice(1)(tl),
    (tl, c: ChartHandle) => (c.slice(2)(tl), c.slice(3)(tl), c.slice(4)(tl)),
    (tl, c: ChartHandle) => c.highlight(1)(tl),
  ],
});
