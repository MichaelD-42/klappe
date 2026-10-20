import { figure } from "klappe/fx";
import { captioned } from "../../10-chart/section";

export default captioned(
  'figure() — a stick figure appears, then f.walk(tl, "M ... C ...") walks it along a curve',
  {
    build: (ctx) => ({ f: figure(ctx, { x: 260, y: 860, color: "var(--k-fg)" }) }),
    steps: [(tl, { f }) => f.appear(tl), (tl, { f }) => f.walk(tl, "M260 860 C 700 600, 1200 960, 1660 720", { duration: 3 })],
  },
  "blackout",
);
