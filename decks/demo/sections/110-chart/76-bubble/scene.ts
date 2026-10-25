import { chart, type ChartHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('chart({ type: "bubble" }) — x, y and size; with a year column, period(i) moves the bubbles', {
  build: (ctx) => chart(ctx, { src: "data/chart-bubble.csv", type: "bubble", rect: { x: 160, y: 80, w: 1600, h: 840 }, title: "Lead time, deploys and team size" }),
  steps: [
    (tl, c: ChartHandle) => (c.axes(tl), c.grow(tl), c.values(tl)),
    (tl, c: ChartHandle) => c.period(1)(tl),
    (tl, c: ChartHandle) => c.period(2)(tl),
  ],
});
