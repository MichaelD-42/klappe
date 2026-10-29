import { assembleDeck } from "../assemble";
import { arrow, compareTable, counter, formula, gauge, likert, mindMap, roadmap, sequence, swimlanes, video, loupe, matrix, pulse, shape, spotlight, stickyNotes, wipe, type CompareTableHandle, type LoupeHandle, type MatrixHandle, type ShapeHandle, type SpotlightHandle, type StickyNotesHandle, type WipeHandle } from "klappe/fx";
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
const clip = (href: string, title: string, start: number, end?: number): SceneModule => ({
  build: (ctx) => video(ctx, { href, title, start, ...(end === undefined ? {} : { end }), rect: { x: 160, y: 140, w: 1600, h: 800 } }),
  steps: [(tl, v: ReturnType<typeof video>) => v.show(tl)],
});
const bands: SceneModule = {
  build: (ctx) => gauge(ctx, { x: 560, y: 200, size: 800, value: 91, max: 100, unit: "%", label: "Load", bands: [{ to: 70, tone: "ok" }, { to: 90, tone: "warn" }, { to: 100, tone: "bad" }] }),
  steps: [(tl, g: ReturnType<typeof gauge>) => g.show(tl)],
};
const status: SceneModule = {
  build: (ctx) =>
    roadmap(ctx, {
      x: 160, y: 140, w: 1600, h: 760, today: "2026-04-15",
      milestones: [
        { id: "a", date: "2026-01-15", label: "Shipped", status: "done" },
        { id: "b", date: "2026-03-15", label: "Wobbly", status: "risk" },
        { id: "c", date: "2026-05-15", label: "Slipped", status: "late" },
        { id: "d", date: "2026-07-15", label: "Planned" },
      ],
    }),
  steps: [(tl, r: ReturnType<typeof roadmap>) => (r.show(tl), r.rush("a", "d")(tl)), (tl, r: ReturnType<typeof roadmap>) => r.move("2026-05-01")(tl)],
};
const mindLight: SceneModule = {
  build: (ctx) => mindMap(ctx, { root: { label: "Topic", children: [{ label: "One", children: [{ label: "a" }] }, { label: "Two" }, { label: "Three" }] }, x: 160, y: 120, w: 1600, h: 800 }),
  steps: [
    (tl, m: ReturnType<typeof mindMap>) => (m.show(tl), m.next()(tl), m.next()(tl), m.next()(tl)),
    (tl, m: ReturnType<typeof mindMap>) => m.light(0)(tl),
    (tl, m: ReturnType<typeof mindMap>) => m.light(2)(tl),
    (tl, m: ReturnType<typeof mindMap>) => m.light(null)(tl),
  ],
};
const seqLight: SceneModule = {
  build: (ctx) =>
    sequence(ctx, {
      x: 160, y: 120, w: 1600, h: 760,
      actors: [{ id: "a", label: "App" }, { id: "b", label: "API" }],
      messages: [{ from: "a", to: "b", text: "GET" }, { from: "b", to: "a", text: "200", reply: true }, { from: "a", to: "b", text: "POST" }],
    }),
  steps: [
    (tl, q: ReturnType<typeof sequence>) => (q.actors(tl), q.message(0)(tl), q.message(1)(tl), q.message(2)(tl)),
    (tl, q: ReturnType<typeof sequence>) => q.highlight(0)(tl),
    (tl, q: ReturnType<typeof sequence>) => q.highlight(null)(tl),
  ],
};
const laneTasks: SceneModule = {
  build: (ctx) =>
    swimlanes(ctx, {
      x: 160, y: 120, w: 1600, h: 760,
      lanes: [{ id: "c", label: "Customer" }, { id: "s", label: "Shop" }],
      tasks: [{ id: "order", lane: "c", col: 0, label: "Order" }, { id: "pack", lane: "s", col: 1, label: "Pack" }, { id: "ship", lane: "s", col: 2, label: "Ship" }],
      links: [{ from: "order", to: "pack" }, { from: "pack", to: "ship" }],
    }),
  steps: [
    (tl, w: ReturnType<typeof swimlanes>) => w.tasks(["order"])(tl),
    (tl, w: ReturnType<typeof swimlanes>) => w.tasks(["pack"])(tl),
    (tl, w: ReturnType<typeof swimlanes>) => w.show(tl),
  ],
};
const countOn: SceneModule = {
  build: (ctx) => counter(ctx, { x: 960, y: 500, from: 0, to: 120, label: "Open tickets" }),
  steps: [(tl, c: ReturnType<typeof counter>) => c.run(tl), (tl, c: ReturnType<typeof counter>) => c.to(80)(tl), (tl, c: ReturnType<typeof counter>) => c.to(12)(tl)],
};
const termLight: SceneModule = {
  build: (ctx) => formula(ctx, { tex: "\\frac{\\step{m}}{\\step{c^2}}", x: 160, y: 300, w: 1600, h: 400 }),
  steps: [
    (tl, f: ReturnType<typeof formula>) => (f.show(tl), f.next()(tl), f.next()(tl)),
    (tl, f: ReturnType<typeof formula>) => f.light(1)(tl),
    (tl, f: ReturnType<typeof formula>) => f.light(0)(tl),
    (tl, f: ReturnType<typeof formula>) => f.light(null)(tl),
  ],
};
const twoHoles: SceneModule = {
  build: (ctx) => ({ a: box(ctx, 160, 300), b: box(ctx, 1360, 600), s: spotlight(ctx) }),
  steps: [
    (tl, r: { a: HTMLElement; b: HTMLElement; s: SpotlightHandle }) => r.s.on(r.a)(tl),
    (tl, r: { a: HTMLElement; b: HTMLElement; s: SpotlightHandle }) => r.s.on([r.a, r.b])(tl),
    (tl, r: { a: HTMLElement; b: HTMLElement; s: SpotlightHandle }) => r.s.on(r.b)(tl),
  ],
};
const fourPoints: SceneModule = {
  build: (ctx) =>
    likert(ctx, {
      x: 160, y: 200, w: 1600,
      scale: ["No", "Rather no", "Rather yes", "Yes"],
      rows: [{ statement: "Releases are predictable", counts: [1, 2, 3, 4] }, { statement: "Five counts", counts: [1, 1, 1, 1, 1] }],
    }),
  steps: [(tl, l: ReturnType<typeof likert>) => (l.show(tl), l.row(0)(tl))],
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
      "sections/10-a/90-clip-file/scene.md": "## Clip file\n\n- 1.5 s to 4 s of a local file.\n",
      "sections/10-a/91-clip-youtube/scene.md": "## Clip YouTube\n\n- 42 s to 70.2 s of a talk.\n",
      "sections/10-a/93-bands/scene.md": "## Bands\n\n- Ok to 70, warn to 90, bad to 100.\n",
      "sections/10-a/94-status/scene.md": "## Status\n\n- Done, at risk, late, planned.\n- They settle.\n",
      "sections/10-a/95-mind-light/scene.md": "## Mind light\n\n- All branches.\n- One lit.\n- Three lit.\n- None lit.\n",
      "sections/10-a/96-seq-light/scene.md": "## Seq light\n\n- Three messages.\n- Back to the first.\n- None lit.\n",
      "sections/10-a/97-lane-tasks/scene.md": "## Lane tasks\n\n- The lanes and the order.\n- Packing, and its link.\n- The rest.\n",
      "sections/10-a/98-count-on/scene.md": "## Count on\n\n- 120.\n- Down to 80.\n- Down to 12.\n",
      "sections/10-a/99-term-light/scene.md": "## Term light\n\n- The formula.\n- The denominator, term 1 in the source, lit.\n- The numerator lit.\n- None lit.\n",
      "sections/10-a/89-two-holes/scene.md": "## Two holes\n\n- One.\n- Both.\n- The second.\n",
      "sections/10-a/88-four-points/scene.md": "## Four points\n\n- No middle: agree is the top two.\n",
      "sections/10-a/92-clip-vimeo/scene.md": "## Clip Vimeo\n\n- From 42 s; Vimeo has no end.\n",
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
      "sections/10-a/90-clip-file/scene.ts": clip("media/clip.webm", "A local clip", 1.5, 4),
      "sections/10-a/91-clip-youtube/scene.ts": clip("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "A talk", 42, 70.2),
      "sections/10-a/93-bands/scene.ts": bands,
      "sections/10-a/94-status/scene.ts": status,
      "sections/10-a/95-mind-light/scene.ts": mindLight,
      "sections/10-a/96-seq-light/scene.ts": seqLight,
      "sections/10-a/97-lane-tasks/scene.ts": laneTasks,
      "sections/10-a/98-count-on/scene.ts": countOn,
      "sections/10-a/99-term-light/scene.ts": termLight,
      "sections/10-a/89-two-holes/scene.ts": twoHoles,
      "sections/10-a/88-four-points/scene.ts": fourPoints,
      "sections/10-a/92-clip-vimeo/scene.ts": clip("https://vimeo.com/76979871", "A Vimeo talk", 42, 50),
    },
  );
  r.deck.files = { data: {}, media: { "media/before.svg": picture("#555555", "#999999"), "media/after.svg": picture("#1d3557", "#2a9d8f"), "media/clip.webm": "data:video/webm;base64," } };
  return r;
};
