import { crt, type CrtHandle, type CrtLine } from "klappe/fx";
import type { SceneModule } from "klappe/types";
import { captioned, captionOf } from "../../../caption";

const BOOT: CrtLine[] = ["DEMO-OS v1.0", "", { text: "MEMORY TEST: 640K OK", count: true }, "DRIVES A: B: C: ... OK"];

// Green, one step per line: power on, four lines, ready.
const scene = captioned("crt() — a terminal powers on, types one line per step, then shows ready", {
  build: (ctx) => crt(ctx, { lines: BOOT }),
  steps: [
    (tl, h: CrtHandle) => h.powerOn(tl),
    ...BOOT.map((_, i) => (tl: gsap.core.Timeline, h: CrtHandle) => h.type(tl, i)),
    (tl, h: CrtHandle) => h.ready(tl),
  ],
}, "fade");

// The bezel ends at y 1040: the two-line caption moves up to keep clear space above it.
const boot: SceneModule = {
  ...scene,
  build(ctx) {
    const refs = scene.build!(ctx);
    refs.root.setAttribute("data-k-bleed", ""); // the bezel fills the frame by design
    captionOf(ctx).style.top = "920px";
    return refs;
  },
};
export default boot;
