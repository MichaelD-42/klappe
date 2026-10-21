import { swimlanes, type SwimlanesHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("walk(id) between tasks with no link moves the token directly and reports nothing", {
  build: (ctx) => ({
    s: swimlanes(ctx, {
      x: 160, y: 140, w: 1600, h: 760,
      lanes: [{ id: "cust", label: "Customer" }, { id: "ops", label: "Operations" }],
      tasks: [
        { id: "order", lane: "cust", col: 0, label: "Place order" },
        { id: "pack", lane: "ops", col: 1, label: "Pack and ship" },
        { id: "notify", lane: "cust", col: 2, label: "Get confirmation" },
      ],
      links: [{ from: "order", to: "pack" }, { from: "pack", to: "notify" }],
    }),
  }),
  steps: [(tl, r: { s: SwimlanesHandle }) => r.s.show(tl), (tl, r) => r.s.walk("order")(tl), (tl, r) => r.s.walk("notify")(tl)],
});
