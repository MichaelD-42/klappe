import { show, text, title, type BasicHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  h: BasicHandle;
  claim: BasicHandle;
  answer: BasicHandle;
}

// The claim on step 1, the answer on step 2.
export default captioned("text(ctx, { text, x, y, w, size }) twice — a claim, then its answer", {
  build: (ctx): Refs => ({
    h: title(ctx),
    claim: text(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 380, w: 1600, size: 96, weight: 700, color: "--k-muted" }),
    answer: text(ctx, { text: ctx.doc!.steps[1].text, x: 200, y: 420, w: 1600, size: 96, weight: 700, color: "--k-accent" }),
  }),
  steps: [
    (tl, r: Refs) => (r.h.show(tl), r.claim.show(tl)),
    (tl, r: Refs) => show(r.answer.el)(tl),
  ],
});
