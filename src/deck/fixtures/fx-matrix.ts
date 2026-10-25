import { assembleDeck } from "../assemble";
import { matrix, type MatrixHandle, type MatrixOpts } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// show, place items, move one to another quadrant, place one again where it is (no move), move the first into
// the gap, and one item label too long for its box (the fixture's only problem). A third scene builds its place
// adders out of step order: the move to tl is built before the first place in tr.
const opts: MatrixOpts = {
  x: 160, y: 140, w: 1600, h: 760,
  axes: { x: "Effort", y: "Impact" },
  quadrants: { tl: "Quick wins", tr: "Big bets", bl: "Fill-ins", br: "Money pits" },
  items: [
    { id: "sso", label: "Single sign-on" },
    { id: "dark", label: "Dark mode" },
    { id: "export", label: "PDF export" },
  ],
};
const md = (title: string, n = 2) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;
type R = { m: MatrixHandle };

const sort: SceneModule = {
  build: (ctx) => ({ m: matrix(ctx, opts) }),
  steps: [
    (tl, r: R) => r.m.show(tl),
    (tl, r: R) => r.m.place("sso", "tr")(tl),
    (tl, r: R) => r.m.place("dark", "bl")(tl),
    (tl, r: R) => r.m.place("export", "tr")(tl),
    (tl, r: R) => r.m.place("sso", "tl")(tl),
    (tl, r: R) => r.m.place("sso", "tl")(tl),
    (tl, r: R) => r.m.place("dark", "tr")(tl),
  ],
};
const long: SceneModule = {
  build: (ctx) => ({ m: matrix(ctx, { ...opts, items: [{ id: "x", label: "An extraordinarily long label that cannot possibly fit two lines at the floor size" }] }) }),
  steps: [(tl, r: R) => r.m.show(tl), (tl, r: R) => r.m.place("x", "br")(tl)],
};

const early: SceneModule = {
  build: (ctx) => {
    const m = matrix(ctx, opts);
    const move = m.place("sso", "tl");
    return { m, move, first: m.place("sso", "tr") };
  },
  steps: [(tl, r: R) => r.m.show(tl), (tl, r: { first: StepAdder }) => r.first(tl), (tl, r: { move: StepAdder }) => r.move(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Matrix\n",
      "sections/10-a/10-sort/scene.md": md("Place and move", 7),
      "sections/10-a/20-long/scene.md": md("Too long", 2),
      "sections/10-a/30-early/scene.md": md("Built early", 3),
    },
    { "sections/10-a/10-sort/scene.ts": sort, "sections/10-a/20-long/scene.ts": long, "sections/10-a/30-early/scene.ts": early },
  );
