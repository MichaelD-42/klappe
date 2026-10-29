import { assembleDeck } from "../assemble";
import { arrow, compareTable, loupe, matrix, pulse, shape, spotlight, stickyNotes, wipe, type CompareTableHandle, type LoupeHandle, type MatrixHandle, type ShapeHandle, type SpotlightHandle, type StickyNotesHandle, type WipeHandle } from "klappe/fx";
import { gsap } from "gsap";
import type { SceneModule, StepAdder } from "../../types";

// The small options, one scene each: a round spotlight, a vertical wipe, a loupe stop with its own zoom, dashed
// and wider shapes and arrows (one too thin: the fixture's only problem), a pulse in another token, and a matrix
// and sticky notes that close the gap an item leaves (compact).
const picture = (fill: string, mark: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="${fill}"/><circle cx="960" cy="540" r="300" fill="${mark}"/></svg>`,
  );
const box = (ctx: Parameters<NonNullable<SceneModule["build"]>>[0], left: number, top: number) => {
  const d = ctx.html.appendChild(document.createElement("div"));
  d.dataset.box = "";
  Object.assign(d.style, { position: "absolute", left: `${left}px`, top: `${top}px`, width: "400px", height: "200px", border: "3px solid var(--k-line)", boxSizing: "border-box" });
  return d;
};

const round: SceneModule = {
  build: (ctx) => ({ b: box(ctx, 760, 440), s: spotlight(ctx, { shape: "circle" }) }),
  steps: [(tl, r: { b: HTMLElement; s: SpotlightHandle }) => r.s.on(r.b)(tl)],
};
const vertical: SceneModule = {
  build: (ctx) => wipe(ctx, { before: { href: "media/before.svg", alt: "A grey dot" }, after: { href: "media/after.svg", alt: "A green dot" }, direction: "vertical" }),
  steps: [(tl, w: WipeHandle) => w.show(tl), (tl, w: WipeHandle) => w.to(0.5)(tl)],
};
const zoom: SceneModule = {
  build: (ctx) => ({ l: loupe(ctx, { href: "media/after.svg", alt: "A green dot", rect: { x: 160, y: 90, w: 1600, h: 900 }, zoom: 2 }) }),
  steps: [(tl, r: { l: LoupeHandle }) => r.l.show(tl), (tl, r: { l: LoupeHandle }) => r.l.to(960, 540, { zoom: 4 })(tl), (tl, r: { l: LoupeHandle }) => r.l.to(500, 300)(tl)],
};
const lines: SceneModule = {
  build: (ctx) => ({
    rect: shape(ctx, { kind: "rect", x: 160, y: 200, w: 600, h: 300, dash: true, width: 6 }),
    arrow: arrow(ctx, { from: { x: 900, y: 350 }, to: { x: 1600, y: 350 }, dash: true }),
    thin: shape(ctx, { kind: "line", x: 160, y: 700, x2: 1600, y2: 700, width: 1 }),
    card: shape(ctx, { kind: "rect", x: 160, y: 780, w: 600, h: 160, fill: true, radius: 24 }),
  }),
  steps: [(tl, r: { rect: ShapeHandle; arrow: ShapeHandle; thin: ShapeHandle; card: ShapeHandle }) => (r.rect.draw(tl), r.arrow.draw(tl), r.thin.draw(tl), r.card.draw(tl))],
};
const warn: SceneModule = {
  build: (ctx) => {
    const b = box(ctx, 760, 440);
    gsap.set(b, { autoAlpha: 1 });
    return { p: pulse(ctx, b, { color: "--k-warn" }) };
  },
  steps: [(tl, r: { p: StepAdder }) => r.p(tl)],
};

const ids = ["a", "b", "c"];
const compactMatrix: SceneModule = {
  build: (ctx) => matrix(ctx, { axes: { x: "Effort", y: "Value" }, items: ids.map((id) => ({ id, label: id.toUpperCase() })), compact: true, x: 160, y: 100, w: 1600, h: 800 }),
  steps: [(tl, m: MatrixHandle) => m.show(tl), ...ids.map((id) => (tl: gsap.core.Timeline, m: MatrixHandle) => m.place(id, "tl")(tl)), (tl, m: MatrixHandle) => m.place("a", "tr")(tl)],
};
const compactNotes: SceneModule = {
  build: (ctx) => stickyNotes(ctx, { notes: ids.map((id) => ({ id, text: id.toUpperCase() })), groups: [{ id: "g1", label: "One" }, { id: "g2", label: "Two" }], compact: true, x: 160, y: 100, w: 1600, h: 800 }),
  steps: [(tl, s: StickyNotesHandle) => s.show()(tl), (tl, s: StickyNotesHandle) => s.group("g1", ids)(tl), (tl, s: StickyNotesHandle) => s.group("g2", ["a"])(tl)],
};
const partial: SceneModule = {
  build: (ctx) => compareTable(ctx, { columns: ["A", "B", "C"], rows: [{ label: "Sign-on", cells: ["~", true, false] }], x: 160, y: 300, w: 1600 }),
  steps: [(tl, t: CompareTableHandle) => (t.show(tl), t.row(0)(tl))],
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Options\n",
      "sections/10-a/10-round/scene.md": "## Round\n\n- A round spotlight.\n",
      "sections/10-a/20-vertical/scene.md": "## Vertical\n\n- Before.\n- Halfway down.\n",
      "sections/10-a/30-zoom/scene.md": "## Zoom\n\n- The lens.\n- Closer.\n- Back to the base zoom.\n",
      "sections/10-a/40-lines/scene.md": "## Lines\n\n- Dashed and wide.\n",
      "sections/10-a/50-warn/scene.md": "## Warn\n\n- A pulse in --k-warn.\n",
      "sections/10-a/60-compact-matrix/scene.md": "## Compact matrix\n\n- Axes.\n- A.\n- B.\n- C.\n- A leaves.\n",
      "sections/10-a/70-compact-notes/scene.md": "## Compact notes\n\n- Scattered.\n- Grouped.\n- A leaves.\n",
      "sections/10-a/80-partial/scene.md": "## Partial\n\n- Partly, yes, no.\n",
    },
    {
      "sections/10-a/10-round/scene.ts": round,
      "sections/10-a/20-vertical/scene.ts": vertical,
      "sections/10-a/30-zoom/scene.ts": zoom,
      "sections/10-a/40-lines/scene.ts": lines,
      "sections/10-a/50-warn/scene.ts": warn,
      "sections/10-a/60-compact-matrix/scene.ts": compactMatrix,
      "sections/10-a/70-compact-notes/scene.ts": compactNotes,
      "sections/10-a/80-partial/scene.ts": partial,
    },
  );
  r.deck.files = { data: {}, media: { "media/before.svg": picture("#555555", "#999999"), "media/after.svg": picture("#1d3557", "#2a9d8f") } };
  return r;
};
