import { flow, type FlowHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("flow(ctx, { nodes, edges, grid }) — show() fades boxes and arrows in, highlight() rings a box", {
  build: (ctx) => ({
    f: flow(ctx, {
      grid: { x: 160, y: 140, w: 1600, h: 760, cols: 4, rows: 2 },
      nodes: [
        { id: "web", label: "Web app", col: 0, row: 0, icon: "monitor" },
        { id: "api", label: "API", col: 1, row: 0, icon: "server" },
        { id: "queue", label: "Queue", col: 2, row: 1, icon: "layers" },
        { id: "db", label: "Database", col: 3, row: 0, icon: "database" },
      ],
      edges: [
        { from: "web", to: "api", label: "HTTPS" },
        { from: "api", to: "queue" },
        { from: "queue", to: "db" },
        { from: "api", to: "db" },
      ],
    }),
  }),
  steps: [(tl, r: { f: FlowHandle }) => r.f.show()(tl), (tl, r) => r.f.highlight(["api"])(tl)],
});
