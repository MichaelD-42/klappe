import type { gsap } from "gsap";
import { crt, type CrtHandle, type CrtLine } from "klappe/fx";
import type { SceneModule } from "klappe/types";

// The spike's boot text (docs/superpowers/spikes/opening). Each entry: the line and the pause after it.
const BOOT: [CrtLine, number][] = [
  ["DEMO-OS v1.0  (c) 1986", 0.5],
  ["", 0.1],
  [{ text: "MEMORY TEST: 640K OK", count: true }, 0.1],
  ["DRIVES A: B: C: ... OK", 0.3],
  ["", 0.1],
  ["Loading: AI agents ............ OK", 0.35],
  ["Loading: knowledge graph ...... OK", 0.35],
  ["Loading: new ways of working .. OK", 0.6],
  ["", 0],
];
const FIRST_LOADING = 5;

const typeLines = (tl: gsap.core.Timeline, h: CrtHandle, from: number, to: number) => {
  for (let i = from; i < to; i++) {
    h.type(tl, i);
    if (BOOT[i][1]) tl.to({}, { duration: BOOT[i][1] });
  }
};

// Same frame as the old way: the screen powers on where the slide fell away, with no camera move.
const scene: SceneModule = {
  place: (rects) => rects["old-way"],
  build: (ctx) => crt(ctx, { lines: BOOT.map(([line]) => line) }),
  steps: [
    (tl, h: CrtHandle) => h.powerOn(tl),
    (tl, h: CrtHandle) => typeLines(tl, h, 0, FIRST_LOADING),
    (tl, h: CrtHandle) => typeLines(tl, h, FIRST_LOADING, BOOT.length),
    (tl, h: CrtHandle) => h.ready(tl),
  ],
};
export default scene;
