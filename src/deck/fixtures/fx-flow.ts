import { assembleDeck } from "../assemble";
import { callout, flow, type FlowHandle, type FlowOpts } from "klappe/fx";
import type { SceneModule } from "../../types";

// Show (all, then by ids), highlight, send with count and label, a callout on node(id), and one node label too
// long for its box (the fixture's only problem).
const grid = { x: 160, y: 140, w: 1600, h: 760, cols: 4, rows: 2 };
const nodes: FlowOpts["nodes"] = [
  { id: "web", label: "Web app", col: 0, row: 0, icon: "monitor" },
  { id: "api", label: "API", col: 1, row: 0, icon: "server" },
  { id: "queue", label: "Queue", col: 2, row: 1 },
  { id: "db", label: "Database", col: 3, row: 0 },
];
const edges: FlowOpts["edges"] = [{ from: "web", to: "api", label: "HTTPS" }, { from: "api", to: "queue" }, { from: "queue", to: "db" }, { from: "api", to: "db" }];
const md = (title: string, n = 2) => `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.\n`).join("")}`;

const parts: SceneModule = {
  build: (ctx) => ({ f: flow(ctx, { grid, nodes, edges }) }),
  steps: [(tl, r: { f: FlowHandle }) => r.f.show(["web", "api"])(tl), (tl, r) => r.f.show()(tl), (tl, r) => r.f.highlight(["api", "db"])(tl)],
};
const send: SceneModule = {
  build: (ctx) => ({ f: flow(ctx, { grid, nodes, edges }) }),
  steps: [(tl, r: { f: FlowHandle }) => r.f.show()(tl), (tl, r) => r.f.send({ path: ["web", "api", "queue", "db"], count: 3, label: "order" })(tl)],
};
const call: SceneModule = {
  build(ctx) {
    const f = flow(ctx, { grid: { ...grid, cols: 3, rows: 1 }, nodes: [{ id: "web", label: "Web app", col: 0, row: 0 }, { id: "api", label: "API", col: 1, row: 0 }], edges: [{ from: "web", to: "api" }] });
    return { f, c: callout(ctx, { target: f.node("api"), text: "Every request passes here", side: "top", offset: 140 }) };
  },
  steps: [(tl, r) => r.f.show()(tl), (tl, r) => r.c.show(tl)],
};
const long: SceneModule = {
  build: (ctx) => ({
    f: flow(ctx, { grid: { ...grid, cols: 4, rows: 4 }, nodes: [{ id: "x", label: "An extraordinarily long label that cannot possibly wrap into three lines at the floor size", col: 0, row: 0 }], edges: [] }),
  }),
  steps: [(tl, r) => r.f.show()(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Flow\n",
      "sections/10-a/10-parts/scene.md": md("Show and highlight", 3),
      "sections/10-a/20-send/scene.md": md("Send"),
      "sections/10-a/30-call/scene.md": md("Callout"),
      "sections/10-a/40-long/scene.md": md("Too long", 1),
    },
    {
      "sections/10-a/10-parts/scene.ts": parts,
      "sections/10-a/20-send/scene.ts": send,
      "sections/10-a/30-call/scene.ts": call,
      "sections/10-a/40-long/scene.ts": long,
    },
  );
