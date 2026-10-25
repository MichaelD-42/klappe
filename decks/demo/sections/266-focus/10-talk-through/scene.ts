import { flow, focus, type FlowHandle, type FocusHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  f: FlowHandle;
  x: FocusHandle;
}

const IDS = ["web", "api", "db"];

export default captioned("focus(ctx, items) — on(item) lights one in place and dims the rest, clear brings all back", {
  build: (ctx): Refs => {
    const f = flow(ctx, {
      grid: { x: 160, y: 300, w: 1600, h: 380, cols: 3, rows: 1 },
      nodes: [
        { id: "web", label: "Web app", col: 0, row: 0, icon: "monitor" },
        { id: "api", label: "API", col: 1, row: 0, icon: "server" },
        { id: "db", label: "Database", col: 2, row: 0, icon: "database" },
      ],
      edges: [{ from: "web", to: "api" }, { from: "api", to: "db" }],
    });
    return { f, x: focus(ctx, IDS.map((id) => f.node(id))) };
  },
  steps: [
    (tl, r: Refs) => r.f.show()(tl),
    (tl, r: Refs) => r.x.on(0)(tl),
    (tl, r: Refs) => r.x.on(1)(tl),
    (tl, r: Refs) => r.x.on(r.f.node("db"))(tl),
    (tl, r: Refs) => r.x.clear(tl),
  ],
});
