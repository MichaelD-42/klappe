import { icon } from "klappe/fx";
import { Rocket } from "klappe/fx/lucide";
import { captioned } from "../../../caption";
import { row } from "../section";

export default captioned(
  'icon(ctx, "rocket" or Rocket, { x, y, size, color }) — any Lucide icon draws on, then lights up',
  {
    build: (ctx) => [
      icon(ctx, "lightbulb", { x: 360, y: 500, color: "var(--k-fg)" }),
      icon(ctx, "cpu", { x: 660, y: 500, size: 160, color: "var(--k-accent)" }),
      icon(ctx, "shield-check", { x: 960, y: 500, size: 240, color: "var(--k-phosphor)" }),
      icon(ctx, "grid-2x2", { x: 1260, y: 500, size: 160, color: "var(--k-phosphor-amber)" }),
      icon(ctx, Rocket, { x: 1560, y: 500, size: 64, color: "var(--k-fg)" }),
    ],
    steps: [(tl, icons) => row(tl, icons, "draw"), (tl, icons) => row(tl, icons, "light")],
  },
  "crt",
);
