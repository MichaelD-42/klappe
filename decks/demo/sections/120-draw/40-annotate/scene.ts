import { annotate, type AnnotateHandle } from "klappe/fx";
import { gsap } from "gsap";
import { captioned } from "../../../caption";

interface Refs {
  p: HTMLElement;
  marks: AnnotateHandle[];
}

// The sentence is step 1's text from scene.md; the marked phrases are spans, so a mark can find them.
const PARTS = ["Ship", " ", "the change", " ", "only after", " the ", "check passes", "."];

export default captioned('annotate(ctx, target, { kind: "circle" | "underline" | "box" | "strike" | "arrow" | "highlight" })', {
  build(ctx): Refs {
    const p = ctx.html.appendChild(document.createElement("p"));
    Object.assign(p.style, { position: "absolute", left: "160px", top: "420px", width: "1600px", margin: "0", font: "600 72px/1.3 var(--k-font)", color: "var(--k-fg)" });
    const spans = PARTS.map((t) => p.appendChild(Object.assign(document.createElement("span"), { textContent: t })));
    if (p.textContent !== ctx.doc!.steps[0].text) ctx.problem("annotate scene: the sentence in scene.ts no longer matches step 1 of scene.md");
    gsap.set(p, { autoAlpha: 0 });
    return {
      p,
      marks: [
        annotate(ctx, spans[4], { kind: "circle" }),
        annotate(ctx, spans[6], { kind: "underline", seed: 3 }),
        annotate(ctx, spans[0], { kind: "arrow", side: "top" }),
        annotate(ctx, spans[2], { kind: "highlight" }),
      ],
    };
  },
  steps: [(tl, r: Refs) => void tl.to(r.p, { autoAlpha: 1, duration: 0.6 }), ...[0, 1, 2, 3].map((i) => (tl: gsap.core.Timeline, r: Refs) => r.marks[i].show(tl))],
});
