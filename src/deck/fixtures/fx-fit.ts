import { assembleDeck } from "../assemble";
import { cardStack, flipCard, matrix, venn, type CardStackHandle, type FlipCardHandle, type MatrixHandle, type VennHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// Text that only fits smaller, and text that fits at no size, in the elements that fit their text when the
// first step is added: flipCard, cardStack, venn and matrix. The second kind are the fixture's only problems.
const words = (n: number) => Array.from({ length: n }, (_, i) => ["release", "test", "ship", "plan"][i % 4]).join(" ");
const LONG = words(40); // about 250 characters: overflows a card at 40 px, fits at 20
const HUGE = words(400);

const flip: SceneModule = {
  build: (ctx) => ({
    a: flipCard(ctx, { x: 160, y: 300, front: "The question?", back: LONG }),
    b: flipCard(ctx, { x: 1120, y: 300, front: "The question?", back: HUGE }),
  }),
  steps: [(tl, r: { a: FlipCardHandle; b: FlipCardHandle }) => (r.a.show(tl), r.b.show(tl)), (tl, r: { a: FlipCardHandle }) => r.a.flip(tl)],
};
const stack: SceneModule = {
  build: (ctx) => ({ c: cardStack(ctx, { x: 780, y: 380, cards: ["Speed", words(30), HUGE] }) }),
  steps: [(tl, r: { c: CardStackHandle }) => r.c.show(tl), (tl, r: { c: CardStackHandle }) => r.c.pull(1)(tl)],
};
const sets: SceneModule = {
  build: (ctx) => ({
    v: venn(ctx, {
      x: 160, y: 120, w: 1600, h: 800,
      sets: [{ id: "a", label: "Design" }, { id: "b", label: words(60) }],
      regions: { a: "Taste", "a+b": words(40) },
    }),
  }),
  steps: [(tl, r: { v: VennHandle }) => r.v.show(tl), (tl, r: { v: VennHandle }) => r.v.light("a", "b")(tl)],
};
const grid: SceneModule = {
  build: (ctx) => ({
    m: matrix(ctx, { x: 160, y: 140, w: 1600, h: 760, axes: { x: "Effort", y: words(80) }, items: [{ id: "sso", label: "Single sign-on" }] }),
  }),
  steps: [(tl, r: { m: MatrixHandle }) => r.m.show(tl), (tl, r: { m: MatrixHandle }) => r.m.place("sso", "tr")(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Fit\n",
      "sections/10-a/10-flip/scene.md": "## Flip\n\n- Show.\n- Flip.\n",
      "sections/10-a/20-stack/scene.md": "## Stack\n\n- Show.\n- Pull.\n",
      "sections/10-a/30-sets/scene.md": "## Sets\n\n- Show.\n- Light.\n",
      "sections/10-a/40-grid/scene.md": "## Grid\n\n- Show.\n- Place.\n",
    },
    {
      "sections/10-a/10-flip/scene.ts": flip,
      "sections/10-a/20-stack/scene.ts": stack,
      "sections/10-a/30-sets/scene.ts": sets,
      "sections/10-a/40-grid/scene.ts": grid,
    },
  );
