import { annotate, type AnnotateHandle } from "klappe/fx";
import { gsap } from "gsap";
import { captioned } from "../../../caption";

interface Refs {
  p: HTMLElement;
  wrong: HTMLElement;
  marks: AnnotateHandle[];
}

// The sentence is step 1's text from scene.md; the marked phrases are spans, so a mark can find them.
const PARTS = ["Ship", " ", "the change", " ", "only after", " the ", "check passes", "."];

export default captioned('annotate(ctx, target, { kind: "circle" | "underline" | "box" | "strike" | "arrow" | "highlight" | "bracket" | "cross", color? })', {
  build(ctx): Refs {
    // Both lines in one block, so the bracket measures them however the sentence wraps.
    const block = ctx.html.appendChild(document.createElement("div"));
    Object.assign(block.style, { position: "absolute", left: "160px", top: "360px", width: "1600px" });
    const font = { font: "600 72px/1.3 var(--k-font)", color: "var(--k-fg)" };
    const p = block.appendChild(document.createElement("p"));
    Object.assign(p.style, { position: "relative", margin: "0", ...font });
    const spans = PARTS.map((t) => p.appendChild(Object.assign(document.createElement("span"), { textContent: t })));
    spans[4].style.margin = "0 48px"; // room for the ring, so it touches neither the highlight nor "the"
    if (p.textContent !== ctx.doc!.steps[0].text) ctx.problem("annotate scene: the sentence in scene.ts no longer matches step 1 of scene.md");
    // Step 6's text, as a second line under the sentence.
    const wrong = block.appendChild(document.createElement("p"));
    Object.assign(wrong.style, { position: "relative", margin: "72px 0 0", width: "max-content", ...font });
    wrong.textContent = ctx.doc!.steps[5].text;
    gsap.set([p, wrong], { autoAlpha: 0 });
    return {
      p,
      wrong,
      marks: [
        annotate(ctx, spans[4], { kind: "circle" }),
        annotate(ctx, spans[6], { kind: "underline", seed: 3 }),
        annotate(ctx, spans[0], { kind: "arrow", side: "top" }),
        annotate(ctx, spans[2], { kind: "highlight" }),
        annotate(ctx, wrong, { kind: "cross" }),
        annotate(ctx, block, { kind: "bracket", side: "left" }),
      ],
    };
  },
  steps: [(tl, r: Refs) => void tl.to(r.p, { autoAlpha: 1, duration: 0.6 }), ...[0, 1, 2, 3].map((i) => (tl: gsap.core.Timeline, r: Refs) => r.marks[i].show(tl)),
    (tl, r: Refs) => void tl.to(r.wrong, { autoAlpha: 1, duration: 0.6 }),
    ...[4, 5].map((i) => (tl: gsap.core.Timeline, r: Refs) => r.marks[i].show(tl)),
  ],
});
