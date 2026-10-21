import { timer, type TimerHandle } from "klappe/fx";
import { captioned } from "../../../caption";

// A target 15 minutes from page load, so the gallery always shows a live count (it is past just before midnight).
const soon = new Date(Date.now() + 15 * 60000);
const hhmm = `${soon.getHours()}:${String(soon.getMinutes()).padStart(2, "0")}`;

export default captioned('timer(ctx, { until: "HH:MM", style, x, y, size, label }) — counts to a time today; past it shows Time\'s up', {
  build: (ctx) => ({
    soon: timer(ctx, { until: hhmm, style: "ring", x: 300, y: 260, size: 520, label: `Break ends ${hhmm}` }),
    past: timer(ctx, { until: "00:00", style: "ring", x: 1100, y: 260, size: 520, label: "Started at midnight" }),
  }),
  steps: [(tl, r: { soon: TimerHandle; past: TimerHandle }) => (r.soon.show(tl), r.past.show(tl))],
});
