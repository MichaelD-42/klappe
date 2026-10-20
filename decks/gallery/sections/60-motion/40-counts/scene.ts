import { counter } from "klappe/fx";
import { captioned } from "../../../caption";
import { heading } from "../section";

// Sample numbers: one counter runs down to zero, the other up.
export default captioned("counter(ctx, { from, to, label }) — a number counts up or down", {
  build: (ctx) => ({
    h: heading(ctx, "Counters"),
    down: counter(ctx, { x: 620, y: 600, from: 128, to: 0, label: "Open questions (sample)" }),
    up: counter(ctx, { x: 1300, y: 600, from: 0, to: 2000, label: "Documents read (sample)" }),
  }),
  steps: [(tl, { h, down }) => (tl.to(h, { autoAlpha: 1, duration: 0.6 }), down.run(tl)), (tl, { up }) => up.run(tl)],
});
