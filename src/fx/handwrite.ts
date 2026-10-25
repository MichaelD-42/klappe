import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface HandwriteOpts {
  text: string;
  x: number; // top-left corner, scene-local
  y: number;
  size?: number; // font size in scene px; default 96
  color?: string; // a --k-* token; default --k-fg
  seed?: number; // the per-glyph timing variance; default 1
}
export interface HandwriteHandle {
  el: HTMLElement;
  write: StepAdder;
}

const PER_GLYPH = 0.09; // seconds a glyph takes to write, on average
const MIN = 0.6;
const MAX = 4;

// A small hash to [0, 1): the same inputs give the same number, so the timing is a function of progress.
function hash(a: number, b: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// How far each character is written at progress p (0..1): 0 hidden, 1 whole. One glyph after another,
// left to right; each takes its share of the time, 0.8 to 1.2 of the average (seeded); a space is a short
// pause. All 0 at p = 0, all 1 at p = 1. Pure.
export function handwriteGlyphs(text: string, p: number, seed: number): number[] {
  const w = [...text].map((c, i) => (/\s/.test(c) ? 0.5 : 0.8 + 0.4 * hash(seed, i)));
  if (p >= 1) return w.map(() => 1); // the running sum may round below 1 on the last glyph
  const total = w.reduce((a, b) => a + b, 0) || 1;
  let start = 0;
  return w.map((wi) => {
    const f = Math.min(1, Math.max(0, (p * total - start) / wi));
    start += wi;
    return f;
  });
}

// The write's length in seconds: by the number of characters, 0.6 s to 4 s.
const duration = (text: string) => Math.min(MAX, Math.max(MIN, [...text].length * PER_GLYPH));

// A short phrase that writes itself in Caveat, glyph by glyph: each glyph is uncovered left to right by a
// clip wipe in percent of its own box, so a font that swaps in mid-write keeps every glyph's share right.
// The root is absolute: nothing else moves when the font loads. Reduced motion: the phrase fades in whole.
export function handwrite(ctx: Ctx, opts: HandwriteOpts): HandwriteHandle {
  // Caveat (SIL OFL 1.1) loads only when a deck calls handwrite; its file is fetched on first use.
  void import("@fontsource/caveat/700.css").then(() => document.fonts.load("700 16px Caveat")).catch(() => {});
  const { x, y, size = 96, color = "--k-fg", seed = 1 } = opts;
  const el = ctx.html.appendChild(document.createElement("div"));
  el.setAttribute("data-k-handwrite", "");
  el.setAttribute("aria-label", opts.text);
  Object.assign(el.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, whiteSpace: "pre",
    font: `700 ${size}px/1.3 Caveat, cursive`, color: `var(${color})`,
  });
  const spans = [...opts.text].map((c) => el.appendChild(Object.assign(document.createElement("span"), { textContent: c })));
  // Negative insets top, bottom and left keep ascenders, descenders and overhangs; whole glyphs drop the clip.
  const draw = (p: number) =>
    handwriteGlyphs(opts.text, p, seed).forEach((f, i) => {
      spans[i].style.clipPath = f >= 1 ? "none" : f <= 0 ? "inset(0 100% 0 0)" : `inset(-0.5em ${((1 - f) * 100).toFixed(2)}% -0.5em -0.5em)`;
    });
  el.setAttribute("data-k-progress", "0");
  draw(0);
  gsap.set(el, { autoAlpha: 0 });
  return {
    el,
    write(tl) {
      if (ctx.reducedMotion) {
        draw(1);
        tl.to(el, { autoAlpha: 1, duration: motion.step });
        return;
      }
      tl.set(el, { autoAlpha: 1 });
      tl.to({}, {
        duration: duration(opts.text),
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          const p = this.progress();
          el.setAttribute("data-k-progress", p.toFixed(3));
          draw(p);
        },
      });
    },
  };
}
