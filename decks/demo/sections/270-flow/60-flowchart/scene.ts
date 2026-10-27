import { flow, type FlowHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('flow() nodes with kind: "terminal", "decision", "store" — dim(ids) fades a part out', {
  build: (ctx) => ({
    f: flow(ctx, {
      grid: { x: 160, y: 140, w: 1600, h: 760, cols: 4, rows: 2 },
      nodes: [
        { id: "in", label: "Order in", col: 0, row: 0, kind: "terminal" },
        { id: "stock", label: "In stock?", col: 1, row: 0, kind: "decision" },
        { id: "db", label: "Stock", col: 1, row: 1, kind: "store" },
        { id: "ship", label: "Ship", col: 2, row: 0 },
        { id: "wait", label: "Back-order", col: 2, row: 1 },
        { id: "done", label: "Done", col: 3, row: 0, kind: "terminal" },
      ],
      edges: [
        { from: "in", to: "stock" },
        { from: "stock", to: "db", label: "look up" },
        { from: "stock", to: "ship", label: "yes" },
        { from: "db", to: "wait", label: "no" },
        { from: "ship", to: "done" },
      ],
    }),
  }),
  steps: [(tl, r: { f: FlowHandle }) => r.f.show()(tl), (tl, r) => r.f.dim(["db", "wait"])(tl), (tl, r) => (r.f.dim([])(tl), r.f.highlight(["stock"])(tl))],
});
