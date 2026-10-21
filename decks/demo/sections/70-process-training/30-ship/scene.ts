import { decisionTree, type TreeHandle } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { title } from "../section";

interface Refs {
  h: HTMLElement;
  t: TreeHandle;
}

const scene: SceneModule = {
  build: (ctx): Refs => ({
    h: title(ctx, "Can we ship?"),
    t: decisionTree(ctx, {
      x: 160, y: 290, w: 1600, h: 700,
      root: {
        label: "Tests green?",
        children: [
          {
            edge: "yes",
            node: {
              label: "Review approved?",
              children: [
                { edge: "yes", node: { label: "Ship it" } },
                { edge: "no", node: { label: "Address the comments" } },
              ],
            },
          },
          { edge: "no", node: { label: "Fix the tests" } },
        ],
      },
    }),
  }),
  steps: [
    (tl, r: Refs) => {
      tl.to(r.h, { autoAlpha: 1, duration: 0.6 });
      r.t.show(tl);
    },
    (tl, r: Refs) => r.t.path(["yes"])(tl),
    (tl, r: Refs) => r.t.path(["yes", "yes"])(tl),
  ],
};
export default scene;
