import { gsap } from "gsap";
import { bubble, counter, mesh3d, morph } from "klappe/fx";
import type { Ctx, SceneModule } from "../../types";
import { assembleDeck } from "../assemble";

const SVG = "http://www.w3.org/2000/svg";

function heading(ctx: Ctx, text: string): HTMLElement {
  const h = document.createElement("h2");
  h.textContent = text;
  ctx.html.append(h);
  gsap.set(h, { autoAlpha: 0 });
  return h;
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, text: string, style: Partial<CSSStyleDeclaration>): HTMLElement {
  const b = document.createElement("div");
  b.textContent = text;
  Object.assign(b.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`,
    boxSizing: "border-box",
    padding: "16px",
    fontSize: "32px",
    ...style,
  });
  ctx.html.append(b);
  return b;
}

// A document becomes a fact becomes a card: two chained HTML morphs.
const chain: SceneModule = {
  build(ctx) {
    const h = heading(ctx, "Document to fact to card");
    const doc = box(ctx, 300, 420, 160, 220, "Doc", { background: "var(--k-fg)", color: "var(--k-bg)" });
    const fact = box(ctx, 820, 490, 300, 80, "Key fact", { background: "var(--k-accent)", color: "var(--k-bg)", fontWeight: "700" });
    const card = box(ctx, 1300, 380, 440, 300, "Card: key fact", { border: "4px solid var(--k-accent)", background: "var(--k-bg)" });
    gsap.set(doc, { autoAlpha: 0 });
    return { h, doc, a: morph(ctx, { from: doc, to: fact }), b: morph(ctx, { from: fact, to: card }) };
  },
  steps: [
    (tl, { h, doc }) => tl.to([h, doc], { autoAlpha: 1, duration: 0.6 }),
    (tl, { a }) => a.play(tl),
    (tl, { b }) => b.play(tl),
  ],
};

// An SVG square becomes a circle in another place.
const shapes: SceneModule = {
  build(ctx) {
    const h = heading(ctx, "Shape to shape");
    const make = (tag: string, attrs: Record<string, number | string>) => {
      const e = document.createElementNS(SVG, tag);
      for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
      ctx.svg.append(e);
      return e;
    };
    // Placed by the author with an SVG translate: the morph must keep it.
    const sq = make("rect", { x: 0, y: 0, width: 160, height: 160, fill: "var(--k-fg)", transform: "translate(300 450)" });
    const dot = make("circle", { cx: 1400, cy: 600, r: 160, fill: "var(--k-accent)" });
    gsap.set(sq, { autoAlpha: 0 });
    return { h, sq, m: morph(ctx, { from: sq, to: dot }) };
  },
  steps: [
    (tl, { h, sq }) => tl.to([h, sq], { autoAlpha: 1, duration: 0.6 }),
    (tl, { m }) => m.play(tl),
  ],
};

// A question and its answer as bubbles on both sides of two speakers, then both hide.
const talk: SceneModule = {
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
};

// The stack of open questions shrinks to zero; a second counter counts up.
const counts: SceneModule = {
  build(ctx) {
    return {
      h: heading(ctx, "Counters"),
      down: counter(ctx, { x: 620, y: 600, from: 128, to: 0, label: "Open questions" }),
      up: counter(ctx, { x: 1300, y: 600, from: 0, to: 2000, label: "Documents read" }),
    };
  },
  steps: [
    (tl, { h, down }) => (tl.to(h, { autoAlpha: 1, duration: 0.6 }), down.run(tl)),
    (tl, { up }) => up.run(tl),
  ],
};

// A mesh with a wrapped bubble beside it and a bubble below it (tail on its top edge).
const wrap: SceneModule = {
  build(ctx) {
    return {
      h: heading(ctx, "Bubble layout"),
      m: mesh3d(ctx, { x: 760, y: 440, size: 360 }),
      beside: bubble(ctx, { x: 960, y: 440, maxWidth: 400, side: "right", text: "A wrapped bubble beside the mesh, at most 400 px wide." }),
      below: bubble(ctx, { x: 760, y: 640, side: "top", text: "A bubble below the mesh." }),
    };
  },
  steps: [
    (tl, { h, m }) => (tl.to(h, { autoAlpha: 1, duration: 0.6 }), m.show(tl)),
    (tl, { beside }) => beside.show(tl),
    (tl, { below }) => below.show(tl),
  ],
};

const md = (title: string, steps: string[]) => `## ${title}\n\n${steps.map((s) => `- ${s}`).join("\n")}\n`;

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-chain/scene.md": md("Chain", ["Show the document.", "It becomes a fact.", "The fact becomes a card."]),
      "sections/10-a/20-shapes/scene.md": md("Shapes", ["Show the square.", "It becomes a circle."]),
      "sections/10-a/30-talk/scene.md": md("Talk", ["Show the speakers.", "Question.", "Answer.", "Both hide."]),
      "sections/10-a/40-counts/scene.md": md("Counts", ["Questions shrink to zero.", "Documents count up."]),
      "sections/10-a/50-wrap/scene.md": md("Wrap", ["Show the mesh.", "A bubble beside it.", "A bubble below it."]),
      "sections/20-b/section.md": "# B\n", // another canvas: the mesh on a stops drawing there
      "sections/20-b/10-other/scene.md": md("Other", ["Another canvas."]),
    },
    {
      "sections/10-a/10-chain/scene.ts": chain,
      "sections/10-a/20-shapes/scene.ts": shapes,
      "sections/10-a/30-talk/scene.ts": talk,
      "sections/10-a/40-counts/scene.ts": counts,
      "sections/10-a/50-wrap/scene.ts": wrap,
    },
  );
