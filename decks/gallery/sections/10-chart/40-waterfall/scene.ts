import { chart } from "klappe/fx";
import { captioned } from "../section";

export default captioned(
  "chart({ type: \"waterfall\" }) — each step adds to or takes from the total",
  {
    build: (ctx) => chart(ctx, { src: "data/chart-waterfall.csv", type: "waterfall", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Bridge" }),
    steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
  },
);
