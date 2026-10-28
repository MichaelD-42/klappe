import { assembleDeck } from "../assemble";
import { annotate, code, type AnnotateHandle } from "klappe/fx";
import { gsap } from "gsap";
import type { SceneModule } from "../../types";

// A paragraph with marked words: each kind of mark on its own step, one on a plain rect, a highlight and then an
// underline on a phrase that wraps onto a second line, then all fade out.
// A second scene marks an element with no size (the fixture's only problem); a third rings one line of dense code;
// a fourth highlights a word on a card with its own background.
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
    return { p, wrap, a, rect: annotate(ctx, { x: 160, y: 700, w: 400, h: 80 }, { kind: "box", seed: 2 }), hl: annotate(ctx, phrase, { kind: "highlight" }), lines: annotate(ctx, phrase, { kind: "underline" }) };
  },
  steps: [
    (tl, r) => void tl.to([r.p, r.wrap], { autoAlpha: 1, duration: 0.6 }),
    ...WORDS.map((_, i) => (tl: gsap.core.Timeline, r: { a: AnnotateHandle[] }) => r.a[i].show(tl)),
    (tl, r: { rect: AnnotateHandle }) => r.rect.show(tl),
    (tl, r: { hl: AnnotateHandle }) => r.hl.show(tl),
    (tl, r: { lines: AnnotateHandle }) => r.lines.show(tl),
    (tl, r: { a: AnnotateHandle[]; rect: AnnotateHandle; hl: AnnotateHandle; lines: AnnotateHandle }) => [...r.a, r.rect, r.hl, r.lines].forEach((h) => h.hide(tl)),
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

const SRC = "const a = 1;\nconst b = 2;\nif (a < b) ship(build());\nconst c = 3;\nconst d = 4;\n";
const onCode: SceneModule = {
  build(ctx) {
    const c = code(ctx, { src: SRC, lang: "text", x: 160, y: 200, w: 1200, h: 400 });
    return { c, a: annotate(ctx, c.line(3), { kind: "circle" }) };
  },
  steps: [(tl, r: { c: ReturnType<typeof code> }) => r.c.show(tl), (tl, r: { a: AnnotateHandle }) => r.a.show(tl)],
};

// A cross takes --k-bad unless told otherwise; a bracket and a box take the colour token they are given; a colour
// that is not a --k-* token is a problem and falls back to the kind's default.
const colors: SceneModule = {
  build(ctx) {
    const box = (x: number) => ({ x, y: 400, w: 300, h: 200 });
    return {
      a: [
        annotate(ctx, box(160), { kind: "cross" }),
        annotate(ctx, box(560), { kind: "bracket", color: "--k-ok" }),
        annotate(ctx, box(960), { kind: "box", color: "--k-warn" }),
        annotate(ctx, box(1360), { kind: "underline", color: "red" }),
      ],
    };
  },
  steps: [(tl, r: { a: AnnotateHandle[] }) => r.a.forEach((h) => h.show(tl))],
};

const onCard: SceneModule = {
  build(ctx) {
    const card = ctx.html.appendChild(document.createElement("div"));
    Object.assign(card.style, { position: "absolute", left: "460px", top: "340px", width: "1000px", padding: "48px", border: "3px solid var(--k-line)", borderRadius: "16px", background: "var(--k-surface)" });
    const p = card.appendChild(document.createElement("p"));
    Object.assign(p.style, { margin: "0", font: "600 56px/1.4 var(--k-font)", color: "var(--k-fg)" });
    p.append("The ");
    const word = p.appendChild(document.createElement("span"));
    word.textContent = "key point";
    word.dataset.word = "card";
    p.append(" of the card");
    return { a: annotate(ctx, word, { kind: "highlight" }) };
  },
  steps: [(tl, r: { a: AnnotateHandle }) => r.a.show(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Annotate\n",
      "sections/10-a/10-marks/scene.md":
        "## Marks\n\n- The text.\n- Circle.\n- Underline.\n- Box.\n- Strike.\n- Arrow.\n- A rect.\n- A highlighted phrase.\n- A wrapped phrase.\n- All fade.\n",
      "sections/10-a/20-no-size/scene.md": "## No size\n\n- A target with no size.\n",
      "sections/10-a/30-code/scene.md": "## Code\n\n- The code.\n- Ring a line.\n",
      "sections/10-a/40-colors/scene.md": "## Colors\n\n- Four marks in their colours.\n",
      "sections/10-a/50-card/scene.md": "## Card\n\n- A highlighted word on a card.\n",
    },
    {
      "sections/10-a/10-marks/scene.ts": marks,
      "sections/10-a/20-no-size/scene.ts": noSize,
      "sections/10-a/30-code/scene.ts": onCode,
      "sections/10-a/40-colors/scene.ts": colors,
      "sections/10-a/50-card/scene.ts": onCard,
    },
  );
