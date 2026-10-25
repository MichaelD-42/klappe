import { gsap } from "gsap";
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
const DIM = 0.3; // seconds for the stage to dim before power-on

interface Refs {
  dim: HTMLElement;
  h: CrtHandle;
}

const typeLines = (tl: gsap.core.Timeline, h: CrtHandle, from: number, to: number) => {
  for (let i = from; i < to; i++) {
    h.type(tl, i);
    if (BOOT[i][1]) tl.to({}, { duration: BOOT[i][1] });
  }
};

// Same frame as the old way: the screen powers on where the slide fell away, with no camera move.
const scene: SceneModule = {
  place: (rects) => rects["old-way"],
  build(ctx): Refs {
    // The lit stage dims to the CRT's own surround first (the .k-retro colour in src/fx/crt.ts), so power-on does not cut to near black.
    const dim = ctx.html.appendChild(document.createElement("div"));
    Object.assign(dim.style, { position: "absolute", inset: "0", background: "color-mix(in srgb, var(--k-bg) 40%, var(--k-blackout))" });
    gsap.set(dim, { autoAlpha: 0 });
    // A soft flash: the power-on keeps the phosphor green instead of a near-white card.
    const h = crt(ctx, { lines: BOOT.map(([line]) => line), flash: "soft" });
    h.root.setAttribute("data-k-bleed", ""); // the bezel fills the frame by design
    return { dim, h };
  },
  steps: [
    (tl, { dim, h }: Refs) => {
      tl.to(dim, { autoAlpha: 1, duration: DIM });
      h.powerOn(tl);
    },
    (tl, { h }: Refs) => typeLines(tl, h, 0, FIRST_LOADING),
    (tl, { h }: Refs) => typeLines(tl, h, FIRST_LOADING, BOOT.length),
    (tl, { h }: Refs) => h.ready(tl),
  ],
};
export default scene;
