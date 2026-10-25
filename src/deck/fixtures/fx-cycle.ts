import { assembleDeck } from "../assemble";
import { cycle, vModel, type CycleHandle, type VModelHandle } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// A PDCA ring: show, light each phase, back to the first. A V model: show, light levels and links in a mix.
// A third scene builds its phase adders out of step order: phase 2 is built before phase 0.
// One phase label too long for its box is the fixture's only problem.
const ring = { x: 960, y: 480, r: 320 };
const md = (title: string, n: number) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;
type C = { c: CycleHandle };
type V = { v: VModelHandle };

const pdca: SceneModule = {
  build: (ctx) => ({ c: cycle(ctx, { ...ring, phases: ["Plan", "Do", "Check", "Act"] }) }),
  steps: [
    (tl, r: C) => r.c.show(tl),
    (tl, r: C) => r.c.phase(0)(tl),
    (tl, r: C) => r.c.phase(1)(tl),
    (tl, r: C) => r.c.phase(2)(tl),
    (tl, r: C) => r.c.phase(3)(tl),
    (tl, r: C) => r.c.phase(0)(tl),
  ],
};
const v: SceneModule = {
  build: (ctx) => ({
    v: vModel(ctx, {
      x: 160, y: 120, w: 1600, h: 760,
      levels: [
        { left: "Requirements", right: "Acceptance test" },
        { left: "System design", right: "System test" },
        { left: "Architecture", right: "Integration test" },
        { left: "Module design", right: "Unit test" },
      ],
    }),
  }),
  steps: [
    (tl, r: V) => r.v.show(tl),
    (tl, r: V) => r.v.level(0)(tl),
    (tl, r: V) => r.v.link(0)(tl),
    (tl, r: V) => r.v.link(3)(tl),
    (tl, r: V) => r.v.level(3)(tl),
    (tl, r: V) => r.v.level(3)(tl),
  ],
};
const early: SceneModule = {
  build: (ctx) => {
    const c = cycle(ctx, { ...ring, phases: ["Plan", "Do", "Check", "Act"] });
    const late = c.phase(2);
    return { c, late, first: c.phase(0) };
  },
  steps: [(tl, r: C) => r.c.show(tl), (tl, r: { first: StepAdder }) => r.first(tl), (tl, r: { late: StepAdder }) => r.late(tl)],
};
const long: SceneModule = {
  build: (ctx) => ({ c: cycle(ctx, { ...ring, phases: ["Plan", "An extraordinarily long phase name that cannot fit two lines", "Check"] }) }),
  steps: [(tl, r: C) => r.c.show(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Cycle\n",
      "sections/10-a/10-pdca/scene.md": md("PDCA", 6),
      "sections/10-a/20-v/scene.md": md("V model", 6),
      "sections/10-a/30-early/scene.md": md("Built early", 3),
      "sections/10-a/40-long/scene.md": md("Too long", 1),
    },
    {
      "sections/10-a/10-pdca/scene.ts": pdca,
      "sections/10-a/20-v/scene.ts": v,
      "sections/10-a/30-early/scene.ts": early,
      "sections/10-a/40-long/scene.ts": long,
    },
  );
