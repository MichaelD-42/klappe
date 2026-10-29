import { flow, spotlight, type FlowHandle, type SpotlightHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  f: FlowHandle;
  s: SpotlightHandle;
}

export default captioned("spotlight(ctx) — on(target) dims all but the target; on([a, b]) frames both; off() lifts", {
  build: (ctx): Refs => ({
    f: flow(ctx, {
      grid: { x: 160, y: 140, w: 1600, h: 700, cols: 3, rows: 1 },
      nodes: [
        { id: "web", label: "Web app", col: 0, row: 0, icon: "monitor" },
        { id: "api", label: "API", col: 1, row: 0, icon: "server" },
        { id: "db", label: "Database", col: 2, row: 0, icon: "database" },
      ],
      edges: [{ from: "web", to: "api" }, { from: "api", to: "db" }],
    }),
    s: spotlight(ctx),
  }),
  steps: [
    (tl, r: Refs) => r.f.show()(tl),
    (tl, r: Refs) => r.s.on(r.f.node("web"))(tl),
    (tl, r: Refs) => r.s.on(r.f.node("api"))(tl),
    (tl, r: Refs) => r.s.on([r.f.node("web"), r.f.node("db")])(tl),
    (tl, r: Refs) => r.s.off(tl),
  ],
});
