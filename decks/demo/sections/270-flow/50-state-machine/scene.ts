import { flow, type FlowHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { f: FlowHandle };

export default captioned("fire(from, to) — the transition draws on and the ring moves to the new state", {
  build: (ctx): R => ({
    f: flow(ctx, {
      grid: { x: 160, y: 160, w: 1600, h: 720, cols: 4, rows: 2 },
      nodes: [
        { id: "placed", label: "Placed", col: 0, row: 0 },
        { id: "paid", label: "Paid", col: 1, row: 0 },
        { id: "shipped", label: "Shipped", col: 2, row: 0 },
        { id: "failed", label: "Delivery failed", col: 2, row: 1 },
        { id: "delivered", label: "Delivered", col: 3, row: 0 },
      ],
      edges: [
        { from: "placed", to: "paid", label: "pay" },
        { from: "paid", to: "shipped", label: "ship" },
        { from: "shipped", to: "delivered", label: "deliver" },
        { from: "shipped", to: "failed", label: "miss" },
        { from: "failed", to: "failed", label: "retry" },
        { from: "failed", to: "delivered", label: "deliver" },
      ],
    }),
  }),
  steps: [
    (tl, r: R) => (r.f.show()(tl), r.f.highlight(["placed"])(tl)),
    (tl, r: R) => (r.f.fire("placed", "paid")(tl), r.f.fire("paid", "shipped")(tl)),
    (tl, r: R) => r.f.fire("shipped", "failed")(tl),
    (tl, r: R) => r.f.fire("failed", "failed")(tl),
    (tl, r: R) => r.f.fire("failed", "delivered")(tl),
  ],
});
