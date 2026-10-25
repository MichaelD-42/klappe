import { iconTile, morph, swarm } from "klappe/fx";
import type { Rect, SceneModule } from "klappe/types";
import { grow, heading, label, stageFrame, svgEl } from "../section";

// Scene-local layout around the Analysis stage, centred in the frame: tile at (960, 851), box below it.
const FROM: Rect = { x: 120, y: 320, w: 260, h: 420 }; // from the Requirements side, at the left
const HEAP: Rect = { x: 760, y: 524, w: 400, h: 240 }; // right over the Analysis tile
const AGENT = { x: 960, y: 330 };
const FACT_Y = 470; // the row the key facts rise to, between the heap and the agent
const FACT = { w: 170, h: 46 };
const CARD = { x: 1300, y: 640, w: 230, h: 150, dx: 26, dy: 40 }; // the stack right of the stage; each card fans up and right
const FACTS = 3;

const hidden = { opacity: "0", visibility: "hidden" };

// An absolutely placed div in scene units.
function div(parent: HTMLElement, r: Rect, css: Partial<CSSStyleDeclaration> = {}): HTMLDivElement {
  const d = document.createElement("div");
  Object.assign(d.style, { position: "absolute", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, boxSizing: "border-box" }, css);
  parent.append(d);
  return d;
}

// A placeholder text line inside a card or fact: no words, so no invented content.
const bar = (parent: HTMLElement, w: string, css: Partial<CSSStyleDeclaration> = {}) =>
  void Object.assign(parent.appendChild(document.createElement("div")).style, { height: "10px", width: w, margin: "10px 0 0", borderRadius: "2px", background: "var(--k-fg)", opacity: "0.6", ...css });

const scene: SceneModule = {
  // place() is the scene's home frame: the engine flies there on entry. camera.to is for moves within a scene.
  place: () => stageFrame("analysis"),
  build(ctx) {
    const docs = swarm(ctx, { rect: { x: 0, y: 0, w: 1920, h: 1080 }, from: FROM, to: HEAP, seed: 7 }); // first: the cards sit above it
    const title = heading(ctx, ctx.doc!.title);
    const agent = iconTile(ctx, "bot", { x: AGENT.x, y: AGENT.y, size: 140, tone: "accent" });
    // The agent's scan line sweeps across the heap.
    const beam = svgEl("rect", { x: HEAP.x - 6, y: HEAP.y - 30, width: 12, height: HEAP.h + 30, rx: 6 });
    Object.assign(beam.style, { fill: "var(--k-accent)", filter: "drop-shadow(0 0 14px var(--k-accent))", ...hidden });
    ctx.svg.append(beam);

    const glow = "0 0 22px var(--k-accent)";
    const items = Array.from({ length: FACTS }, (_, i) => {
      // A key fact in the heap: a small lit document.
      const doc = div(ctx.html, { x: HEAP.x + HEAP.w * (0.25 + 0.25 * i) - 14, y: HEAP.y + HEAP.h * 0.55, w: 28, h: 38 }, {
        background: "var(--k-accent)", borderRadius: "3px", boxShadow: glow, ...hidden,
      });
      // The fact lifted out of it: a highlighted line.
      const fact = div(ctx.html, { x: AGENT.x + (i - 1) * (FACT.w + 20) - FACT.w / 2, y: FACT_Y - FACT.h / 2, ...FACT }, {
        border: "3px solid var(--k-accent)", borderRadius: "6px", padding: "0 16px", boxShadow: glow,
        background: "color-mix(in srgb, var(--k-accent) 25%, var(--k-bg))",
      });
      bar(fact, "100%", { margin: "15px 0 0", opacity: "0.9" });
      // The structured card it becomes: a header and three fields.
      const card = div(ctx.html, { x: CARD.x + i * CARD.dx, y: CARD.y - i * CARD.dy, w: CARD.w, h: CARD.h }, {
        border: "3px solid var(--k-accent)", borderRadius: "6px", padding: "0 18px", background: "var(--k-bg)",
        boxShadow: "0 8px 18px rgb(0 0 0 / 0.45)",
      });
      bar(card, "calc(100% + 36px)", { height: "22px", margin: "0 -18px 6px", borderRadius: "0", background: "var(--k-accent)", opacity: "1" });
      for (const w of ["90%", "70%", "80%"]) bar(card, w);
      return { doc, lift: morph(ctx, { from: doc, to: fact }), stack: morph(ctx, { from: fact, to: card }) };
    });
    // Captions in the spec's own words.
    const names = {
      docs: label(ctx, "Documents", HEAP.x - 130, HEAP.y + HEAP.h - 30),
      agent: label(ctx, "AI agent", AGENT.x + 190, AGENT.y),
      facts: label(ctx, "Key facts", AGENT.x + 1.5 * (FACT.w + 20) + 90, FACT_Y),
      cards: label(ctx, "Cards", CARD.x + CARD.w / 2 + CARD.dx, CARD.y + CARD.h + 30),
    };
    return { docs, title, agent, beam, items, names };
  },
  // The flight needs no words: the documents start streaming as the camera lands, on the same press.
  auto: [0.2, null, null, null],
  steps: [
    // The camera flies to the Analysis stage.
    (tl, r, ctx) => {
      const stream = ctx.canvas.refs.stream;
      // "<": with this step's entry flight. The overview's grown stages shrink back as the camera dives in,
      // and the neighbour boxes, cut by the frame edges, fade (Clarification brings them back).
      grow(tl, stream, false, "<");
      tl.fromTo([stream.boxes[0], stream.boxes[2]], { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.8 }, "<"); // start written at load: play = seek
      tl.to(r.title, { autoAlpha: 1, duration: 0.6 });
      stream.tiles[1].light(tl, "<");
    },
    // Thousands of documents stream in.
    (tl, r) => {
      r.docs.stream(tl, { duration: 3 });
      tl.to(r.names.docs, { autoAlpha: 1, duration: 0.5 });
    },
    // An AI agent scans them. Key facts light up and move into structured cards.
    (tl, r) => {
      r.agent.draw(tl);
      tl.to(r.names.agent, { autoAlpha: 1, duration: 0.5 }, "<");
      r.agent.light(tl);
      tl.fromTo(r.beam, { autoAlpha: 0, x: 0 }, { autoAlpha: 0.9, duration: 0.3 });
      tl.fromTo(r.beam, { x: 0 }, { x: HEAP.w, duration: 1.4, ease: "sine.inOut" });
      tl.to(r.beam, { autoAlpha: 0, duration: 0.3 });
      tl.fromTo(r.items.map((it: { doc: HTMLElement }) => it.doc), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.4, stagger: 0.15, ease: "back.out(3)" });
      for (const it of r.items) it.lift.play(tl);
      tl.to(r.names.facts, { autoAlpha: 1, duration: 0.5 });
    },
    // The cards stack up next to the stage.
    (tl, r) => {
      tl.to(r.names.facts, { autoAlpha: 0, duration: 0.4 });
      for (const it of r.items) it.stack.play(tl);
      tl.to(r.names.cards, { autoAlpha: 1, duration: 0.5 });
    },
  ],
};
export default scene;
