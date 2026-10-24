import { timer, type TimerHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("timer(ctx, { minutes, style, x, y, size, label }) — wall-clock; warns in the last 20%, then Time's up", {
  build: (ctx) => ({ t: timer(ctx, { minutes: 10, style: "ring", x: 700, y: 260, size: 520, label: "Exercise 1: map the process" }) }),
  steps: [(tl, r: { t: TimerHandle }) => r.t.show(tl), null],
});
