import { assembleDeck } from "../assemble";
import { decisionTree, type TreeHandle, type TreeNode } from "klappe/fx";
import type { SceneModule } from "../../types";

// show with build all, path (a route, then a longer one), level with build levels, and the two problems:
// a path edge that is not there, and a tree too wide for its box.
const rect = { x: 160, y: 140, w: 1600, h: 760 };
const root: TreeNode = {
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
};
const wide: TreeNode = { label: "Pick one", children: Array.from({ length: 20 }, (_, i) => ({ edge: `${i + 1}`, node: { label: `Option ${i + 1}` } })) };
const md = (title: string, n = 2) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;

const all: SceneModule = {
  build: (ctx) => ({ t: decisionTree(ctx, { root, ...rect }) }),
  steps: [(tl, r: { t: TreeHandle }) => r.t.show(tl), (tl, r) => r.t.path(["yes"])(tl), (tl, r) => r.t.path(["yes", "no"])(tl), (tl, r) => r.t.path(["no"])(tl)],
};
const levels: SceneModule = {
  build: (ctx) => ({ t: decisionTree(ctx, { root, ...rect, build: "levels" }) }),
  steps: [(tl, r: { t: TreeHandle }) => r.t.level(0)(tl), (tl, r) => r.t.level(1)(tl), (tl, r) => r.t.level(2)(tl)],
};
const missing: SceneModule = {
  build: (ctx) => ({ t: decisionTree(ctx, { root, ...rect }) }),
  steps: [(tl, r: { t: TreeHandle }) => r.t.show(tl), (tl, r) => r.t.path(["yes", "maybe"])(tl)],
};
const oversize: SceneModule = {
  build: (ctx) => ({ t: decisionTree(ctx, { root: wide, ...rect }) }),
  steps: [(tl, r: { t: TreeHandle }) => r.t.show(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Tree\n",
      "sections/10-a/10-all/scene.md": md("Show and path", 4),
      "sections/10-a/20-levels/scene.md": md("Levels", 3),
      "sections/10-a/30-missing/scene.md": md("Missing edge"),
      "sections/10-a/40-oversize/scene.md": md("Too wide", 1),
    },
    {
      "sections/10-a/10-all/scene.ts": all,
      "sections/10-a/20-levels/scene.ts": levels,
      "sections/10-a/30-missing/scene.ts": missing,
      "sections/10-a/40-oversize/scene.ts": oversize,
    },
  );
