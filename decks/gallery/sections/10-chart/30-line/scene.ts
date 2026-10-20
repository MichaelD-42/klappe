import { chart } from "klappe/fx";
import { captioned } from "../section";

export default captioned(
  "chart({ type: \"line\" }) — the lines draw from left to right",
  {
    build: (ctx) => chart(ctx, { src: "data/chart-line.csv", type: "line", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Value by month" }),
    steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
  },
);
