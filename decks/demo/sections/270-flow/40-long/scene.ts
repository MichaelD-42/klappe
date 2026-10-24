import { flow, type FlowHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("Labels wrap, then shrink to 20 px — about two short words per line", {
  build: (ctx) => ({
    f: flow(ctx, {
      grid: { x: 160, y: 140, w: 1600, h: 760, cols: 3, rows: 2 },
      nodes: [
        { id: "a", label: "Customer order intake", col: 0, row: 0 },
        { id: "b", label: "Validation and fraud screening", col: 1, row: 0 },
        { id: "c", label: "Fulfilment", col: 2, row: 0 },
      ],
      edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }],
    }),
  }),
  steps: [(tl, r: { f: FlowHandle }) => r.f.show()(tl)],
});
