import { cycle, type CycleHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("cycle(ctx, { x, y, r, phases }) — phase(i) lights one; the last one settles", {
  build: (ctx) => ({ c: cycle(ctx, { x: 960, y: 490, r: 330, phases: ["Plan", "Do", "Check", "Act"] }) }),
  steps: [
    (tl, r: { c: CycleHandle }) => r.c.show(tl),
    (tl, r) => r.c.phase(0)(tl),
    (tl, r) => r.c.phase(1)(tl),
    (tl, r) => r.c.phase(2)(tl),
    (tl, r) => r.c.phase(3)(tl),
    (tl, r) => r.c.phase(0)(tl),
  ],
});
