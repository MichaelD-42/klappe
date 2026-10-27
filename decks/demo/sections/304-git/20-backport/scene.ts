import type { gsap } from "gsap";
import { gitGraph, type GitGraphHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { g: GitGraphHandle };

export default captioned('gitGraph ops { tag, on } and { cherryPick, onto }: a tag over a tip, a copy with its original kept', {
  build: (ctx): R => ({
    g: gitGraph(ctx, {
      x: 160, y: 220, w: 1600, h: 520,
      ops: [
        { commit: "main", label: "init" },
        { tag: "v1.0", on: "main" },
        { branch: "release", from: "main" },
        { commit: "main", label: "feature" },
        { commit: "release", label: "hotfix" },
        { tag: "v1.0.1", on: "release" },
        { cherryPick: "hotfix", onto: "main" },
      ],
    }),
  }),
  steps: Array.from({ length: 7 }, () => (tl: gsap.core.Timeline, r: R) => r.g.next(tl)),
});
