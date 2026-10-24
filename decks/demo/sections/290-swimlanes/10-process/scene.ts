import { swimlanes, type SwimlanesHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("swimlanes(ctx, { lanes, tasks, links, x, y, w, h }) — walk(id) moves the token; the active lane brightens", {
  build: (ctx) => ({
    s: swimlanes(ctx, {
      x: 160, y: 140, w: 1600, h: 760,
      lanes: [{ id: "cust", label: "Customer" }, { id: "sales", label: "Sales" }, { id: "ops", label: "Operations" }],
      tasks: [
        { id: "order", lane: "cust", col: 0, label: "Place order" },
        { id: "check", lane: "sales", col: 1, label: "Check order" },
        { id: "approve", lane: "sales", col: 2, label: "Approve" },
        { id: "pack", lane: "ops", col: 2, label: "Pack and ship" },
        { id: "notify", lane: "cust", col: 3, label: "Get confirmation" },
      ],
      links: [
        { from: "order", to: "check" },
        { from: "check", to: "approve" },
        { from: "approve", to: "pack" },
        { from: "approve", to: "notify" },
        { from: "pack", to: "notify" },
      ],
    }),
  }),
  steps: [
    (tl, r: { s: SwimlanesHandle }) => r.s.show(tl),
    (tl, r) => r.s.walk("order")(tl),
    (tl, r) => r.s.walk("check")(tl),
    (tl, r) => r.s.walk("approve")(tl),
    (tl, r) => r.s.walk("pack")(tl),
    (tl, r) => r.s.walk("notify")(tl),
  ],
});
