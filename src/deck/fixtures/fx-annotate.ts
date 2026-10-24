import { assembleDeck } from "../assemble";
import { annotate, type AnnotateHandle } from "klappe/fx";
import { gsap } from "gsap";
import type { SceneModule } from "../../types";

// A paragraph with marked words: each kind of mark on its own step, one on a plain rect, an underline on a
// phrase that wraps onto a second line, then all fade out.
// A second scene marks an element with no size (the fixture's only problem).
const WORDS = ["circle", "underline", "box", "strike", "arrow"] as const;

const marks: SceneModule = {
  build(ctx) {
    const p = ctx.html.appendChild(document.createElement("p"));
    Object.assign(p.style, { position: "absolute", left: "160px", top: "420px", width: "1600px", font: "600 56px/1.4 var(--k-font)", color: "var(--k-fg)", margin: "0" });
    const spans = WORDS.map((w) => {
      const s = document.createElement("span");
      s.textContent = w;
      s.dataset.word = w;
      p.append(s, " ");
      return s;
    });
    const wrap = ctx.html.appendChild(document.createElement("p"));
    Object.assign(wrap.style, { position: "absolute", left: "1000px", top: "700px", width: "600px", font: "600 48px/1.4 var(--k-font)", color: "var(--k-fg)", margin: "0" });
    wrap.append("Only ");
    const phrase = wrap.appendChild(document.createElement("span"));
    phrase.textContent = "a phrase that wraps onto the next line";
    phrase.dataset.word = "wrapped";
    gsap.set([p, wrap], { autoAlpha: 0 });
    const a = WORDS.map((kind, i) => annotate(ctx, spans[i], { kind, side: "top" }));
    return { p, wrap, a, rect: annotate(ctx, { x: 160, y: 700, w: 400, h: 80 }, { kind: "box", seed: 2 }), lines: annotate(ctx, phrase, { kind: "underline" }) };
  },
  steps: [
    (tl, r) => void tl.to([r.p, r.wrap], { autoAlpha: 1, duration: 0.6 }),
    ...WORDS.map((_, i) => (tl: gsap.core.Timeline, r: { a: AnnotateHandle[] }) => r.a[i].show(tl)),
    (tl, r: { rect: AnnotateHandle }) => r.rect.show(tl),
    (tl, r: { lines: AnnotateHandle }) => r.lines.show(tl),
    (tl, r: { a: AnnotateHandle[]; rect: AnnotateHandle; lines: AnnotateHandle }) => [...r.a, r.rect, r.lines].forEach((h) => h.hide(tl)),
  ],
};

const noSize: SceneModule = {
  build(ctx) {
    const hidden = ctx.html.appendChild(document.createElement("div"));
    hidden.style.display = "none";
    return { a: annotate(ctx, hidden, { kind: "circle" }) };
  },
  steps: [(tl, r: { a: AnnotateHandle }) => r.a.show(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Annotate\n",
      "sections/10-a/10-marks/scene.md":
        "## Marks\n\n- The text.\n- Circle.\n- Underline.\n- Box.\n- Strike.\n- Arrow.\n- A rect.\n- A wrapped phrase.\n- All fade.\n",
      "sections/10-a/20-no-size/scene.md": "## No size\n\n- A target with no size.\n",
    },
    { "sections/10-a/10-marks/scene.ts": marks, "sections/10-a/20-no-size/scene.ts": noSize },
  );
