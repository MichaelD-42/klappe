import { flow, type FlowHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("send({ path, count, label }) — packets are timeline tweens, so they seek", {
  build: (ctx) => ({
    f: flow(ctx, {
      grid: { x: 160, y: 140, w: 1600, h: 760, cols: 4, rows: 2 },
      nodes: [
        { id: "web", label: "Web app", col: 0, row: 0 },
        { id: "api", label: "API", col: 1, row: 0 },
        { id: "queue", label: "Queue", col: 2, row: 1 },
        { id: "db", label: "Database", col: 3, row: 0 },
      ],
      edges: [
        { from: "web", to: "api" },
        { from: "api", to: "queue" },
        { from: "queue", to: "db" },
      ],
    }),
  }),
  steps: [(tl, r: { f: FlowHandle }) => r.f.show()(tl), (tl, r) => r.f.send({ path: ["web", "api", "queue", "db"], count: 3, label: "order" })(tl)],
});
