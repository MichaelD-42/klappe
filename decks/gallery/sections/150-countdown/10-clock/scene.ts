import { countdown, type CountdownHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type Refs = { run: CountdownHandle; past: CountdownHandle };

// Left: 10 minutes from the first visible frame. Right: "00:00" has passed (or is now), so it holds 0:00.
export default captioned("countdown() — time left to HH:MM or for N minutes, on its own clock", {
  build: (ctx): Refs => ({
    run: countdown(ctx, { x: 560, y: 470, minutes: 10, label: "Exercise" }),
    past: countdown(ctx, { x: 1360, y: 470, until: "00:00", label: "Break ends 00:00" }),
  }),
  steps: [(tl, r: Refs) => r.run.show(tl), (tl, r: Refs) => r.past.show(tl)],
}, "cut");
