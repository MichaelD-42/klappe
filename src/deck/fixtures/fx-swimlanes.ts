import { assembleDeck } from "../assemble";
import { swimlanes, type SwimlanesHandle, type SwimlanesOpts } from "klappe/fx";
import type { SceneModule } from "../../types";

// show, walk along links across lanes, a walk between tasks with no link (moves directly), and one task label
// too long for its box (the fixture's only problem).
const rect = { x: 160, y: 140, w: 1600, h: 760 };
const lanes: SwimlanesOpts["lanes"] = [{ id: "cust", label: "Customer" }, { id: "sales", label: "Sales" }, { id: "ops", label: "Operations" }];
const tasks: SwimlanesOpts["tasks"] = [
  { id: "order", lane: "cust", col: 0, label: "Place order" },
  { id: "check", lane: "sales", col: 1, label: "Check order" },
  { id: "approve", lane: "sales", col: 2, label: "Approve" },
  { id: "pack", lane: "ops", col: 2, label: "Pack and ship" },
  { id: "notify", lane: "cust", col: 3, label: "Get confirmation" },
];
const links: SwimlanesOpts["links"] = [
  { from: "order", to: "check" },
  { from: "check", to: "approve" },
  { from: "approve", to: "pack" },
  { from: "approve", to: "notify" },
  { from: "pack", to: "notify" },
];
const md = (title: string, n = 2) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;
type R = { s: SwimlanesHandle };

const walk: SceneModule = {
  build: (ctx) => ({ s: swimlanes(ctx, { ...rect, lanes, tasks, links }) }),
  steps: [
    (tl, r: R) => r.s.show(tl),
    (tl, r: R) => r.s.walk("order")(tl),
    (tl, r: R) => r.s.walk("check")(tl),
    (tl, r: R) => r.s.walk("approve")(tl),
    (tl, r: R) => r.s.walk("pack")(tl),
    (tl, r: R) => r.s.walk("notify")(tl),
  ],
};
const direct: SceneModule = {
  build: (ctx) => ({ s: swimlanes(ctx, { ...rect, lanes, tasks, links }) }),
  steps: [(tl, r: R) => r.s.show(tl), (tl, r: R) => r.s.walk("order")(tl), (tl, r: R) => r.s.walk("notify")(tl)],
};
const long: SceneModule = {
  build: (ctx) => ({
    s: swimlanes(ctx, {
      ...rect, lanes: lanes.slice(0, 2), links: [],
      tasks: [{ id: "x", lane: "cust", col: 0, label: "An extraordinarily long label that cannot possibly wrap into three lines at the floor size" }, { id: "y", lane: "sales", col: 5, label: "Short" }],
    }),
  }),
  steps: [(tl, r: R) => r.s.show(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Swimlanes\n",
      "sections/10-a/10-walk/scene.md": md("Show and walk", 6),
      "sections/10-a/20-direct/scene.md": md("Unlinked walk", 3),
      "sections/10-a/30-long/scene.md": md("Too long", 1),
    },
    { "sections/10-a/10-walk/scene.ts": walk, "sections/10-a/20-direct/scene.ts": direct, "sections/10-a/30-long/scene.ts": long },
  );
