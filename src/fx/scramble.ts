import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";
import { typeSize } from "./draw";

export interface ScrambleOpts {
  text: string;
  x: number; // top-left corner, scene-local
  y: number;
  w?: number; // the width the text wraps at; default: to the scene's right edge
  size?: number; // font size in scene px; default 72
  seed?: number; // picks the glyphs and the order; default 1
}
export interface ScrambleHandle {
  run: StepAdder;
}

// A glyph of the same kind as its letter takes about the same width, so the decode does not spill.
const GLYPHS = { lower: "abcdeghknopqrsuvxyz", upper: "ABCDEGHKNOPRSUVXYZ", digit: "0123456789", other: "#%&*+=?" };
const kind = (c: string) => (/[a-z]/.test(c) ? "lower" : /[A-Z]/.test(c) ? "upper" : /[0-9]/.test(c) ? "digit" : "other");
const FRAMES = 24; // glyph changes over the decode: about 16 a second over its 1.5 s
const DECODE = 1.5;

// A small hash to [0, 1): the same inputs give the same number, so glyphs are a function of progress.
function hash(a: number, b: number, c: number): number {
  let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x7f4a7c15, 0xc2b2ae35) ^ Math.imul(c + 0x165667b1, 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d);
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

// What each character shows at progress p (0..1): a random glyph while it decodes, null once it has
// settled on the real one. Spaces never scramble. Letters settle about left to right, all by p = 1. Pure.
export function scrambleGlyphs(text: string, p: number, seed: number): (string | null)[] {
  const chars = [...text];
  const frame = Math.floor(p * FRAMES);
  return chars.map((c, i) => {
    if (/\s/.test(c)) return null;
    const settle = 0.15 + 0.7 * (i / Math.max(1, chars.length - 1)) + 0.15 * (hash(seed, i, -1) - 0.5);
    if (p >= settle) return null;
    const set = GLYPHS[kind(c)];
    return set[Math.floor(hash(seed, i, frame) * set.length)];
  });
}

const CSS = `[data-k-scramble] > span { position: relative; }
[data-k-scramble] > span[data-g] { color: transparent; }
[data-k-scramble] > span[data-g]::after { content: attr(data-g); position: absolute; left: 50%; top: 0; transform: translateX(-50%); color: var(--k-accent); }`;

function addStyle() {
  if (document.getElementById("k-scramble-style")) return;
  const s = document.createElement("style");
  s.id = "k-scramble-style";
  s.textContent = CSS;
  document.head.append(s);
}

// A line that decodes: it shows as random glyphs in --k-accent that settle, about left to right, on the
// real text. Each character is laid out from the start, so the line never reflows; a glyph is drawn over
// its transparent character. Written from onUpdate as a pure function of progress (scrambleGlyphs).
// Reduced motion: the text fades in, already settled.
export function scramble(ctx: Ctx, opts: ScrambleOpts): ScrambleHandle {
  addStyle();
  const { x, y, size = typeSize("title", 72), seed = 1 } = opts;
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-scramble", "");
  root.setAttribute("aria-label", opts.text);
  Object.assign(root.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, width: `${opts.w ?? ctx.rect.w - x}px`,
    font: `700 ${size}px/1.2 var(--k-font)`, color: "var(--k-fg)",
  });
  const spans = [...opts.text].map((c) => root.appendChild(Object.assign(document.createElement("span"), { textContent: c })));
  const draw = (p: number) =>
    scrambleGlyphs(opts.text, p, seed).forEach((g, i) => (g === null ? spans[i].removeAttribute("data-g") : spans[i].setAttribute("data-g", g)));
  root.setAttribute("data-k-progress", "0");
  draw(0);
  gsap.set(root, { autoAlpha: 0 });
  return {
    run(tl) {
      tl.to(root, { autoAlpha: 1, duration: motion.step });
      if (ctx.reducedMotion) {
        draw(1);
        return;
      }
      tl.to({}, {
        duration: DECODE,
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          const p = this.progress();
          root.setAttribute("data-k-progress", p.toFixed(3));
          draw(p);
        },
      }, "<");
    },
  };
}
