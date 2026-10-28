import { assembleDeck } from "../assemble";
import { depGraph, type DepGraphHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// Six services: shown, the API's dependencies traced, the database's blast radius traced, cleared. A second scene
// has a cycle and traces a node that is not there (the fixture's two problems).
const md = (title: string, n: number) => `## ${title}\n\n${"- Step.\n".repeat(n)}`;
const nodes = [
  { id: "web", label: "Web app" },
  { id: "mobile", label: "Mobile app" },
  { id: "api", label: "API" },
  { id: "auth", label: "Auth" },
  { id: "cache", label: "Cache" },
  { id: "db", label: "Database" },
];
const links = [
  { from: "web", to: "api" },
  { from: "mobile", to: "api" },
  { from: "api", to: "auth" },
  { from: "api", to: "db" },
  { from: "auth", to: "db" },
  { from: "api", to: "cache" },
];
type R = { g: DepGraphHandle };
const graph: SceneModule = {
  build: (ctx) => ({ g: depGraph(ctx, { nodes, links, x: 160, y: 120, w: 1600, h: 720 }) }),
  steps: [(tl, r: R) => r.g.show(tl), (tl, r: R) => r.g.trace("api")(tl), (tl, r: R) => r.g.trace("db", { up: true })(tl), (tl, r: R) => r.g.clear(tl)],
};
const bad: SceneModule = {
  build: (ctx) => ({ g: depGraph(ctx, { nodes: nodes.slice(0, 2), links: [{ from: "web", to: "mobile" }, { from: "mobile", to: "web" }], x: 160, y: 120, w: 1600, h: 720 }) }),
  steps: [(tl, r: R) => r.g.show(tl), (tl, r: R) => r.g.trace("nope")(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Dependencies\n",
      "sections/10-a/10-graph/scene.md": md("Graph", 4),
      "sections/10-a/20-bad/scene.md": md("Bad", 2),
    },
    { "sections/10-a/10-graph/scene.ts": graph, "sections/10-a/20-bad/scene.ts": bad },
  );
