import { assembleDeck } from "../assemble";
import { pyramid, type PyramidHandle, type PyramidOpts } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// A test pyramid built bottom-up in three steps; a stack of bars with one label too long for its bar, and a
// third next() past its top (the fixture's two problems). A third scene makes its second next() adder before its first and runs them in step order.
const tests: PyramidOpts = {
  x: 460, y: 140, w: 1000, h: 760,
  layers: [{ id: "unit", label: "Unit tests" }, { id: "int", label: "Integration" }, { id: "e2e", label: "End to end" }],
};
const md = (title: string, n = 2) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;
type R = { p: PyramidHandle };

const walk: SceneModule = {
  build: (ctx) => ({ p: pyramid(ctx, tests) }),
  steps: [(tl, r: R) => r.p.next()(tl), (tl, r: R) => r.p.next()(tl), (tl, r: R) => r.p.next()(tl)],
};
const stack: SceneModule = {
  build: (ctx) => ({
    p: pyramid(ctx, {
      x: 660, y: 300, w: 600, h: 400, shape: "stack",
      layers: [{ id: "hw", label: "Hardware" }, { id: "long", label: "An extraordinarily long layer label that cannot possibly fit on one line at the floor size" }],
    }),
  }),
  steps: [(tl, r: R) => r.p.next()(tl), (tl, r: R) => r.p.next()(tl), (tl, r: R) => r.p.next()(tl)],
};
const early: SceneModule = {
  build: (ctx) => {
    const p = pyramid(ctx, tests);
    const second = p.next();
    return { p, second, first: p.next() };
  },
  steps: [(tl, r: { first: StepAdder }) => r.first(tl), (tl, r: { second: StepAdder }) => r.second(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Pyramid\n",
      "sections/10-a/10-walk/scene.md": md("Bottom-up", 3),
      "sections/10-a/20-stack/scene.md": md("Stack", 3),
      "sections/10-a/30-early/scene.md": md("Built early", 2),
    },
    { "sections/10-a/10-walk/scene.ts": walk, "sections/10-a/20-stack/scene.ts": stack, "sections/10-a/30-early/scene.ts": early },
  );
