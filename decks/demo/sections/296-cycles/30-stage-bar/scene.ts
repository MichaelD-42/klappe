import { processSteps, title, type BasicHandle, type ProcessStepsHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("processSteps(ctx, { steps, x, y, w, h }) — to(i) lights the stage you are at", {
  build: (ctx) => ({
    h: title(ctx),
    p: processSteps(ctx, { steps: ["Plan", "Build", "Test", "Release", "Learn"], x: 160, y: 480, w: 1600, h: 140 }),
  }),
  steps: [
    (tl, r: { h: BasicHandle; p: ProcessStepsHandle }) => (r.h.show(tl), r.p.show(tl)),
    (tl, r) => r.p.to(1)(tl),
    (tl, r) => r.p.to(2)(tl),
    (tl, r) => r.p.to(3)(tl),
  ],
});
