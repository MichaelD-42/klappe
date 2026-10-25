import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import { rng } from "./mesh3d";
import type { TransitionOpts } from "./transitions";

const DURATION = 0.5;
const FRAMES = 12; // distinct states, about 24 per second: a digital stutter, not a smooth move
const H = 1080;

export interface GlitchFrame {
  bands: { y: number; h: number; fresh: boolean }[]; // horizontal bands that tile the frame; fresh: the new canvas shows there
  dx: [number, number]; // sideways offset of the old and the new canvas, px
  split: number; // colour split, px
}

// The glitch at progress p (0 to 1): a pure function of p and seed, so a seek shows the same frame as play.
// The share of fresh bands grows frame by frame; the offsets peak mid-way.
export function glitchFrame(p: number, seed = 1): GlitchFrame {
  const f = Math.min(FRAMES - 1, Math.max(0, Math.floor(p * FRAMES)));
  const rand = rng(seed * 7919 + f);
  const bands: GlitchFrame["bands"] = [];
  for (let y = 0; y < H; ) {
    const h = Math.min(H - y, Math.round(30 + rand() * 220));
    bands.push({ y, h, fresh: false });
    y += h;
  }
  // The first frame is all old, the last all new; each frame between shows both.
  const n = bands.length;
  const fresh = f === 0 ? 0 : f === FRAMES - 1 ? n : Math.min(n - 1, Math.max(1, Math.round((f / (FRAMES - 1)) * n)));
  bands
    .map((b) => ({ b, key: rand() }))
    .sort((a, c) => a.key - c.key)
    .slice(0, fresh)
    .forEach(({ b }) => (b.fresh = true));
  const amp = 16 + 64 * Math.sin((Math.PI * (f + 0.5)) / FRAMES);
  // At least 40 % of the frame's amplitude, to either side.
  const jump = () => Math.round((rand() < 0.5 ? -1 : 1) * (0.4 + 0.6 * rand()) * amp);
  const dx: [number, number] = [jump(), jump()];
  return { bands, dx, split: Math.round(amp / 6) };
}

// The bands as one clip-path: zero-width runs down the left edge join them, so they add no area.
const clip = (bands: GlitchFrame["bands"]) =>
  bands.length ? `polygon(${bands.map((b) => `0px ${b.y}px, 1920px ${b.y}px, 1920px ${b.y + b.h}px, 0px ${b.y + b.h}px`).join(", ")})` : "inset(50%)";

// A short digital break-up: both canvases show in horizontal bands that jump sideways with a colour split,
// and the bands turn from old to new over 0.5 s. transitionOptions: { seed } picks another pattern.
export function transitionGlitch(from: CanvasRuntime, to: CanvasRuntime, opts: TransitionOpts & { seed?: number }): gsap.core.Timeline {
  const els = [from.el, to.el];
  const draw = (p: number) => {
    if (p >= 1) {
      for (const e of els) Object.assign(e.style, { clipPath: "", translate: "", filter: "" });
      gsap.set(from.el, { autoAlpha: 0 });
      return;
    }
    const g = glitchFrame(p, opts.seed);
    els.forEach((e, i) =>
      Object.assign(e.style, {
        clipPath: clip(g.bands.filter((b) => b.fresh === (i === 1))),
        translate: `${g.dx[i]}px 0px`,
        // The split uses the theme's two accents, so calm and bold each glitch in their own colours.
        filter: `drop-shadow(${g.split}px 0 0 var(--k-accent)) drop-shadow(${-g.split}px 0 0 var(--k-accent-2))`,
      }),
    );
  };
  return gsap
    .timeline()
    .set(to.el, { autoAlpha: 1 })
    .to({}, { duration: DURATION, ease: "none", onUpdate: function (this: gsap.core.Tween) { draw(this.progress()); } })
    .set(from.el, { autoAlpha: 0 })
    .set(to.el, { autoAlpha: 1 });
}
