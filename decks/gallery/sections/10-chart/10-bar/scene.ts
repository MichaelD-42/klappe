import { chart } from "klappe/fx";
import { captioned } from "../section";

export default captioned(
  "chart() — bars grow from the axis",
  {
    build: (ctx) => chart(ctx, { src: "data/chart-bar.csv", type: "bar", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Units by quarter" }),
    steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
  },
);
