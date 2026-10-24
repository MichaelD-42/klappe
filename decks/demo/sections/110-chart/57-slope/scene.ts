import { chart } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('chart({ type: "slope" }) — before and after, one line per group', {
  build: (ctx) => chart(ctx, { src: "data/chart-slope.csv", type: "slope", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Lead time in days, before and after" }),
  steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
});
