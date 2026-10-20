import { gsap } from "gsap";
import { bubble } from "klappe/fx";
import { box, captioned, heading } from "../section";

// A question and its answer as bubbles beside two speakers, then both hide.
export default captioned('bubble(ctx, { x, y, text, side }) — b.show(tl) and b.hide(tl)', {
  build(ctx) {
    const h = heading(ctx, "Questions and answers");
    const left = box(ctx, 260, 560, 120, 120, "", { background: "var(--k-fg)" });
    const right = box(ctx, 1540, 560, 120, 120, "", { background: "var(--k-accent)" });
    gsap.set([left, right], { autoAlpha: 0 });
    return {
      shown: [h, left, right],
      q: bubble(ctx, { x: 400, y: 520, text: "A sample question for [Site 1]?", side: "right" }),
      a: bubble(ctx, { x: 1520, y: 720, text: "A sample answer from [Site 2].", side: "left" }),
    };
  },
  steps: [
    (tl, { shown }) => tl.to(shown, { autoAlpha: 1, duration: 0.6 }),
    (tl, { q }) => q.show(tl),
    (tl, { a }) => a.show(tl),
    (tl, { q, a }) => (q.hide(tl), a.hide(tl, "<")),
  ],
});
