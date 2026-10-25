import { chart } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('chart({ type: "scatter" }) — two number columns, x and y; one dot per row', {
  build: (ctx) => chart(ctx, { src: "data/chart-scatter.csv", type: "scatter", rect: { x: 160, y: 80, w: 1600, h: 840 }, title: "Lead time and deploys, by team" }),
  steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
});
