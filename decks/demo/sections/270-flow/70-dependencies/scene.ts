import { depGraph, type DepGraphHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { g: DepGraphHandle };

export default captioned("depGraph(ctx, { nodes, links }) — laid out from the links; trace(id) and trace(id, { up: true }) light it hop by hop", {
  build: (ctx): R => ({
    g: depGraph(ctx, {
      x: 160, y: 100, w: 1600, h: 760,
      nodes: [
        { id: "web", label: "Web shop" },
        { id: "mobile", label: "Mobile app" },
        { id: "partner", label: "Partner API" },
        { id: "orders", label: "Orders" },
        { id: "payments", label: "Payments" },
        { id: "auth", label: "Auth" },
        { id: "queue", label: "Queue" },
        { id: "db", label: "Orders DB" },
      ],
      links: [
        { from: "web", to: "orders" },
        { from: "mobile", to: "orders" },
        { from: "partner", to: "orders" },
        { from: "web", to: "auth" },
        { from: "mobile", to: "auth" },
        { from: "orders", to: "payments" },
        { from: "orders", to: "queue" },
        { from: "orders", to: "db" },
        { from: "payments", to: "queue" },
      ],
    }),
  }),
  steps: [
    (tl, r: R) => r.g.show(tl),
    (tl, r: R) => r.g.trace("orders")(tl),
    (tl, r: R) => r.g.trace("queue", { up: true })(tl),
    (tl, r: R) => r.g.clear(tl),
  ],
});
