import { assembleDeck } from "../assemble";
import { flow, type FlowHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// flow as a state machine: the start state ringed, then one transition per step, a self-loop twice in a row,
// and a transition with no edge (the fixture's only problem).
const f = (ctx: Parameters<NonNullable<SceneModule["build"]>>[0]) =>
  flow(ctx, {
    grid: { x: 160, y: 160, w: 1600, h: 700, cols: 3, rows: 2 },
    nodes: [
      { id: "idle", label: "Idle", col: 0, row: 0 },
      { id: "run", label: "Running", col: 1, row: 0 },
      { id: "fail", label: "Failed", col: 1, row: 1 },
      { id: "done", label: "Done", col: 2, row: 0 },
    ],
    edges: [
      { from: "idle", to: "run", label: "start" },
      { from: "run", to: "done", label: "finish" },
      { from: "run", to: "fail", label: "error" },
      { from: "fail", to: "fail", label: "retry" },
      { from: "fail", to: "run", label: "recover" },
    ],
  });
type R = { f: FlowHandle };
const machine: SceneModule = {
  build: (ctx) => ({ f: f(ctx) }),
  steps: [
    (tl, r: R) => (r.f.show()(tl), r.f.highlight(["idle"])(tl)),
    (tl, r: R) => r.f.fire("idle", "run")(tl),
    (tl, r: R) => r.f.fire("run", "fail")(tl),
    (tl, r: R) => r.f.fire("fail", "fail")(tl),
    (tl, r: R) => r.f.fire("fail", "fail")(tl),
    (tl, r: R) => r.f.fire("fail", "run")(tl),
    (tl, r: R) => r.f.fire("run", "done")(tl),
    (tl, r: R) => r.f.fire("done", "idle")(tl),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# State\n",
      "sections/10-a/10-machine/scene.md": `## Machine\n\n${Array.from({ length: 8 }, (_, i) => `- Step ${i + 1}.\n`).join("")}`,
    },
    { "sections/10-a/10-machine/scene.ts": machine },
  );
