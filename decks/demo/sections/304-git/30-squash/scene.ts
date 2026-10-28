import type { gsap } from "gsap";
import { gitGraph, type GitGraphHandle, type GitOp } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { g: GitGraphHandle };

const ops: GitOp[] = [
  { commit: "main", label: "init" },
  { checkout: "main" },
  { branch: "feature", from: "main" },
  { checkout: "feature" },
  { commit: "feature", label: "form" },
  { commit: "feature", label: "tests" },
  { checkout: "main" },
  { squash: "feature", into: "main" },
];

export default captioned("gitGraph ops { checkout } and { squash, into }: HEAD follows the branch you are on; a squash is one commit", {
  build: (ctx) => ({ g: gitGraph(ctx, { ops, x: 160, y: 200, w: 1600, h: 560 }) }),
  steps: ops.map(() => (tl: gsap.core.Timeline, r: R) => r.g.next(tl)),
});
