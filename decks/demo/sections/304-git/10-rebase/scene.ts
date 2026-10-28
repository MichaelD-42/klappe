import { gitGraph, type GitGraphHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { g: GitGraphHandle };

export default captioned("gitGraph(ctx, { ops, x, y, w, h }) — next() plays one op: commit, branch, rebase or merge", {
  build: (ctx): R => ({
    g: gitGraph(ctx, {
      x: 160, y: 220, w: 1600, h: 520,
      ops: [
        { commit: "main", label: "init" },
        { branch: "feature", from: "main" },
        { commit: "feature", label: "form" },
        { commit: "main", label: "hotfix" },
        { commit: "feature", label: "tests" },
        { rebase: "feature", onto: "main" },
        { merge: "feature", into: "main" },
      ],
    }),
  }),
  steps: Array.from({ length: 7 }, () => (tl: gsap.core.Timeline, r: R) => r.g.next(tl)),
});
