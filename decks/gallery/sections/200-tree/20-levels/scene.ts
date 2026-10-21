import { decisionTree, type TreeHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('decisionTree(ctx, { …, build: "levels" }) — level(k) shows depth k', {
  build: (ctx) => ({
    t: decisionTree(ctx, {
      x: 160, y: 140, w: 1600, h: 760, build: "levels",
      root: {
        label: "Ship it?",
        children: [
          { edge: "yes", node: { label: "Tests green?", children: [{ edge: "yes", node: { label: "Deploy" } }, { edge: "no", node: { label: "Fix first" } }] } },
          { edge: "no", node: { label: "Wait" } },
        ],
      },
    }),
  }),
  steps: [(tl, r: { t: TreeHandle }) => r.t.level(0)(tl), (tl, r) => r.t.level(1)(tl), (tl, r) => r.t.level(2)(tl)],
});
