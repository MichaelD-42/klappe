import { gsap } from "gsap";
import { assembleDeck } from "../assemble";
import type { Ctx, SceneModule } from "../../types";

// Look mistakes on purpose, for the walk's soft checks: a card that runs into the right margin, a box
// that clips its text, and a band off the left edge marked data-k-bleed that must not be reported.
const box = (ctx: Ctx, css: Partial<CSSStyleDeclaration>, text: string) => {
  const d = ctx.html.appendChild(document.createElement("div"));
  Object.assign(d.style, { position: "absolute", fontSize: "40px", background: "var(--k-surface)", ...css });
  d.textContent = text;
  return d;
};
const scene: SceneModule = {
  build(ctx) {
    const edge = box(ctx, { left: "1500px", top: "300px", width: "400px" }, "Edge card");
    const clip = box(ctx, { left: "200px", top: "300px", width: "300px", height: "60px", overflow: "hidden" }, "Too much text for this small box");
    const band = box(ctx, { left: "-40px", top: "700px", width: "700px", height: "120px" }, "Bleed band");
    band.setAttribute("data-k-bleed", "");
    gsap.set([edge, clip, band], { autoAlpha: 0 });
    return { edge, clip, band };
  },
  steps: [(tl, { edge, clip, band }) => void tl.to([edge, clip, band], { autoAlpha: 1, duration: 0.2 })],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-look/scene.md": "## Look\n\n- Show the boxes.\n",
    },
    { "sections/10-a/10-look/scene.ts": scene },
  );
