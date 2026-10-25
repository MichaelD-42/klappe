import { assembleDeck } from "../assemble";
import { redline, splitFlap, type RedlineHandle, type SplitFlapHandle } from "klappe/fx";
import type { SceneModule, StepAdder } from "../../types";

// A redline that shows, applies and cleans; a split-flap board that flips twice; and a board whose to() adders
// are built out of step order (the second before the first), which must still flip in step order.
const md = (title: string, n: number) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;

type R = { r: RedlineHandle };
const prose: SceneModule = {
  build: (ctx) => ({
    r: redline(ctx, {
      before: "We release every month after a manual test run.",
      after: "We release every week after an automated test run.",
      x: 160, y: 300, w: 1400, size: 56,
    }),
  }),
  steps: [(tl, r: R) => r.r.show(tl), (tl, r: R) => r.r.apply(tl), (tl, r: R) => r.r.clean(tl)],
};

type F = { f: SplitFlapHandle };
const board: SceneModule = {
  build: (ctx) => ({ f: splitFlap(ctx, { x: 160, y: 300, cells: 8, text: "Boarding" }) }),
  steps: [(tl, r: F) => r.f.show(tl), (tl, r: F) => r.f.to("Delayed")(tl), (tl, r: F) => r.f.to("Gate 12")(tl)],
};
const early: SceneModule = {
  build: (ctx) => {
    const f = splitFlap(ctx, { x: 160, y: 300, cells: 4, text: "0" });
    const late = f.to("2026");
    return { f, late, first: f.to("1999") };
  },
  steps: [(tl, r: F) => r.f.show(tl), (tl, r: { first: StepAdder }) => r.first(tl), (tl, r: { late: StepAdder }) => r.late(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Redline and split-flap\n",
      "sections/10-a/05-before/scene.md": md("Before", 1),
      "sections/10-a/10-prose/scene.md": md("Prose", 3),
      "sections/10-a/20-board/scene.md": md("Board", 3),
      "sections/10-a/30-early/scene.md": md("Early", 3),
    },
    { "sections/10-a/10-prose/scene.ts": prose, "sections/10-a/20-board/scene.ts": board, "sections/10-a/30-early/scene.ts": early },
  );
