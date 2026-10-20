import type { gsap } from "gsap";
import { crt, type CrtHandle, type CrtLine } from "klappe/fx";
import { captioned } from "../../../caption";

const BOOT: CrtLine[] = ["DEMO-OS v1.0  (c) 1986", "", { text: "MEMORY TEST: 640K OK", count: true }, "DRIVES A: B: C: ... OK"];

// Green, one step per line: power on, four lines, ready.
export default captioned("crt() — a terminal powers on, types one line per step, then shows ready", {
  build: (ctx) => crt(ctx, { lines: BOOT }),
  steps: [
    (tl, h: CrtHandle) => h.powerOn(tl),
    ...BOOT.map((_, i) => (tl: gsap.core.Timeline, h: CrtHandle) => h.type(tl, i)),
    (tl, h: CrtHandle) => h.ready(tl),
  ],
}, "fade");
