import { formula, title, type BasicHandle, type FormulaHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("formula(ctx, { tex, … }) — \\step{…} marks a term; next() shows one; light(i) lights it", {
  build: (ctx) => ({
    h: title(ctx),
    f: formula(ctx, { tex: String.raw`P(A \mid B) = \frac{\step{P(B \mid A)}\,\step{P(A)}}{\step{P(B)}}`, x: 160, y: 300, w: 1600, h: 560, size: 96 }),
  }),
  steps: [
    (tl, r: { h: BasicHandle; f: FormulaHandle }) => (r.h.show(tl), r.f.show(tl)),
    (tl, r) => r.f.next()(tl),
    (tl, r) => r.f.next()(tl),
    (tl, r) => r.f.next()(tl),
    (tl, r) => r.f.light(1)(tl),
  ],
});
