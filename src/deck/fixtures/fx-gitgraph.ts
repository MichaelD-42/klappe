import { assembleDeck } from "../assemble";
import { gitGraph, type GitGraphHandle, type GitOp } from "klappe/fx";
import type { gsap } from "gsap";
import type { SceneModule } from "../../types";

// Every op once, one per step (a branch, commits on both lanes, a rebase, a merge), then the whole history at
// once with one next() too many (the fixture's only problem).
const ops: GitOp[] = [
  { commit: "main", label: "init" },
  { branch: "feature", from: "main" },
  { commit: "feature", label: "form" },
  { commit: "main", label: "hotfix" },
  { commit: "feature", label: "tests" },
  { rebase: "feature", onto: "main" },
  { merge: "feature", into: "main" },
];
const rect = { x: 160, y: 200, w: 1600, h: 500 };
type R = { g: GitGraphHandle };

const steps: SceneModule = {
  build: (ctx) => ({ g: gitGraph(ctx, { ops, ...rect }) }),
  steps: ops.map(() => (tl: gsap.core.Timeline, r: R) => r.g.next(tl)),
};
const all: SceneModule = {
  build: (ctx) => ({ g: gitGraph(ctx, { ops, ...rect }) }),
  steps: [(tl, r: R) => r.g.show(tl), (tl, r: R) => r.g.next(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Git\n",
      "sections/10-a/10-steps/scene.md": `## Steps\n\n${ops.map((_, i) => `- Op ${i + 1}.\n`).join("")}`,
      "sections/10-a/20-all/scene.md": "## All\n\n- All at once.\n- One too many.\n",
    },
    { "sections/10-a/10-steps/scene.ts": steps, "sections/10-a/20-all/scene.ts": all },
  );
