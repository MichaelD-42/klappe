import { chart } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('chart({ type: "donut" }) — parts of a whole, the total in the centre', {
  build: (ctx) => chart(ctx, { src: "data/chart-donut.csv", type: "donut", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Where a sprint's hours go" }),
  steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
});
