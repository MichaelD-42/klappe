import { gsap } from "gsap";
import { morph } from "klappe/fx";
import { box, captioned, heading } from "../section";

// A document becomes a fact becomes a card: two chained HTML morphs.
export default captioned(
  "morph(ctx, { from, to }) — one element turns into another; chain them",
  {
    build(ctx) {
      const h = heading(ctx, "Document to fact to card");
      const doc = box(ctx, 300, 420, 160, 220, "Doc", { background: "var(--k-fg)", color: "var(--k-bg)" });
      const fact = box(ctx, 820, 490, 300, 80, "Key fact", { background: "var(--k-accent)", color: "var(--k-bg)", fontWeight: "700" });
      const card = box(ctx, 1300, 380, 440, 300, "Card: key fact", { border: "4px solid var(--k-accent)", background: "var(--k-bg)" });
      gsap.set(doc, { autoAlpha: 0 });
      return { h, doc, a: morph(ctx, { from: doc, to: fact }), b: morph(ctx, { from: fact, to: card }) };
    },
    steps: [(tl, { h, doc }) => tl.to([h, doc], { autoAlpha: 1, duration: 0.6 }), (tl, { a }) => a.play(tl), (tl, { b }) => b.play(tl)],
  },
  "fade",
);
