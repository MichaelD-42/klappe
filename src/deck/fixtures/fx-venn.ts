import { assembleDeck } from "../assemble";
import { venn, type VennHandle, type VennOpts } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// Three sets: show, light one circle, a pair, all three, and one circle again (its label stays, no flash).
// Two sets: show and light the overlap. A third scene builds its light adders out of step order: the pair's
// adder is made before the single circle's, and the single one runs first.
const three: VennOpts = {
  x: 160, y: 120, w: 1600, h: 800,
  sets: [{ id: "a", label: "Design" }, { id: "b", label: "Code" }, { id: "c", label: "Data" }],
  regions: { a: "Taste", "b+a": "Prototypes", "a+b+c": "Products" },
};
const md = (title: string, n = 2) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;
type R = { v: VennHandle };

const walk: SceneModule = {
  build: (ctx) => ({ v: venn(ctx, three) }),
  steps: [
    (tl, r: R) => r.v.show(tl),
    (tl, r: R) => r.v.light("a")(tl),
    (tl, r: R) => r.v.light("b", "a")(tl),
    (tl, r: R) => r.v.light("a", "b", "c")(tl),
    (tl, r: R) => r.v.light("a")(tl),
  ],
};
const two: SceneModule = {
  build: (ctx) => ({ v: venn(ctx, { x: 160, y: 120, w: 1600, h: 800, sets: [{ id: "x", label: "Want" }, { id: "y", label: "Need" }], regions: { "x+y": "Do it" } }) }),
  steps: [(tl, r: R) => r.v.show(tl), (tl, r: R) => r.v.light("x", "y")(tl)],
};
const early: SceneModule = {
  build: (ctx) => {
    const v = venn(ctx, three);
    const pair = v.light("a", "b");
    return { v, pair, single: v.light("a") };
  },
  steps: [(tl, r: R) => r.v.show(tl), (tl, r: { single: StepAdder }) => r.single(tl), (tl, r: { pair: StepAdder }) => r.pair(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Venn\n",
      "sections/10-a/10-walk/scene.md": md("Three sets", 5),
      "sections/10-a/20-two/scene.md": md("Two sets", 2),
      "sections/10-a/30-early/scene.md": md("Built early", 3),
    },
    { "sections/10-a/10-walk/scene.ts": walk, "sections/10-a/20-two/scene.ts": two, "sections/10-a/30-early/scene.ts": early },
  );
