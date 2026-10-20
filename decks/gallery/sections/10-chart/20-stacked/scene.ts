import { chart } from "klappe/fx";
import { captioned } from "../section";

export default captioned(
  "chart({ type: \"stacked\" }) — each bar grows from its parts",
  {
    build: (ctx) => chart(ctx, { src: "data/chart-stacked.csv", type: "stacked", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Units by part" }),
    steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
  },
);
