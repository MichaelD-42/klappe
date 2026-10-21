import { timer, type TimerHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('style: "donut", "text" and "bar"; "ring" is on the scene before', {
  build: (ctx) => ({
    d: timer(ctx, { minutes: 5, style: "donut", x: 160, y: 320, size: 420, label: "Break" }),
    t: timer(ctx, { minutes: 15, style: "text", x: 700, y: 400, size: 480 }),
    b: timer(ctx, { minutes: 2, style: "bar", x: 1260, y: 470, size: 500, label: "Pair swap" }),
  }),
  steps: [(tl, r: { d: TimerHandle; t: TimerHandle; b: TimerHandle }) => (r.d.show(tl), r.t.show(tl), r.b.show(tl))],
});
