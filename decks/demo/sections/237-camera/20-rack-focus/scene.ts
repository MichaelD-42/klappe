import { flow, rackFocus, type FlowHandle, type FocusHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  f: FlowHandle;
  x: FocusHandle;
}

const IDS = ["plan", "build", "ship"];

export default captioned("rackFocus(ctx, items) — on(item) keeps one sharp and blurs the rest, as a lens pulls focus", {
  build: (ctx): Refs => {
    const f = flow(ctx, {
      grid: { x: 160, y: 300, w: 1600, h: 380, cols: 3, rows: 1 },
      nodes: [
        { id: "plan", label: "Plan", col: 0, row: 0, icon: "lightbulb" },
        { id: "build", label: "Build", col: 1, row: 0, icon: "cpu" },
        { id: "ship", label: "Ship", col: 2, row: 0, icon: "rocket" },
      ],
      edges: [{ from: "plan", to: "build" }, { from: "build", to: "ship" }],
    });
    return { f, x: rackFocus(ctx, IDS.map((id) => f.node(id))) };
  },
  steps: [
    (tl, r: Refs) => r.f.show()(tl),
    (tl, r: Refs) => r.x.on(0)(tl),
    (tl, r: Refs) => r.x.on(2)(tl),
    (tl, r: Refs) => r.x.clear(tl),
  ],
});
