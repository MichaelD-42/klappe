import { chart } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned(
  "chart() — bars grow from the axis; lines: [{ value, label }] draws a goal",
  {
    build: (ctx) => chart(ctx, { src: "data/chart-bar.csv", type: "bar", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Units by quarter", lines: [{ value: 200, label: "Goal" }] }),
    steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
  },
);
