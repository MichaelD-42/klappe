import { decisionTree, type TreeHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("decisionTree(ctx, { root, x, y, w, h }) — show() draws the tree, path() lights a route", {
  build: (ctx) => ({
    t: decisionTree(ctx, {
      x: 160, y: 140, w: 1600, h: 760,
      root: {
        label: "Is it a bug?",
        children: [
          {
            edge: "yes",
            node: {
              label: "Can you repeat it?",
              children: [
                { edge: "yes", node: { label: "Fix it" } },
                { edge: "no", node: { label: "Ask for steps" } },
              ],
            },
          },
          { edge: "no", node: { label: "Plan it" } },
        ],
      },
    }),
  }),
  steps: [(tl, r: { t: TreeHandle }) => r.t.show(tl), (tl, r) => r.t.path(["yes"])(tl), (tl, r) => r.t.path(["yes", "no"])(tl)],
});
