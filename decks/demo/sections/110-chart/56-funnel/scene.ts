import { chart } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('chart({ type: "funnel" }) — stages by value, the conversion between them', {
  build: (ctx) => chart(ctx, { src: "data/chart-funnel.csv", type: "funnel", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "From visit to renewal, last quarter" }),
  steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
});
