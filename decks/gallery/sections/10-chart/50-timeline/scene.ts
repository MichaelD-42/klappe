import { chart } from "klappe/fx";
import { captioned } from "../section";

export default captioned(
  "chart({ type: \"timeline\" }) — phases grow along the years",
  {
    build: (ctx) => chart(ctx, { src: "data/chart-timeline.csv", type: "timeline", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Phases" }),
    steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
  },
);
