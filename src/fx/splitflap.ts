import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";
import { typeSize } from "./draw";

export interface SplitFlapOpts {
  x: number; // top-left corner, scene-local
  y: number;
  cells: number; // how many characters the board holds
  text: string; // what it shows first
  size?: number; // font size in scene px; default 96
}
export interface SplitFlapHandle {
  show: StepAdder;
  to(text: string): StepAdder; // flips each cell through the drum to the new text
  el: HTMLElement;
}

// The drum every cell turns through, in order. A character not on it changes in one flip at the cell's end.
const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789.,:-+%/€$&?!";
const FLIP = 1.8; // seconds for the whole board

// ß upper-cases to SS, two cells; ẞ keeps the word's length.
const fit = (s: string, cells: number) => s.replaceAll("ß", "ẞ").toUpperCase().slice(0, cells).padEnd(cells, " ");

// What each cell shows at progress p (0..1) of a flip from one text to another. Texts are upper-cased and
// left-aligned in the cells. Each cell steps forward through the drum from its old character to its new one;
// a cell starts a little after the one to its left, and all land at p = 1. p = 0 gives the old text. Pure.
export function flapGlyphs(from: string, to: string, p: number, cells: number): string[] {
  const [a, b] = [fit(from, cells), fit(to, cells)];
  const lag = cells > 1 ? Math.min(0.04, 0.5 / (cells - 1)) : 0; // a cell's start after its left neighbour, as a share of p
  return [...b].map((t, i) => {
    const f = a[i];
    const q = Math.min(1, Math.max(0, (p - i * lag) / (1 - (cells - 1) * lag)));
    const [s, e] = [DRUM.indexOf(f), DRUM.indexOf(t)];
    if (s < 0 || e < 0) return q >= 1 ? t : f;
    return DRUM[(s + Math.floor(q * ((e - s + DRUM.length) % DRUM.length))) % DRUM.length];
  });
}

// An airport board: a row of cells that flip through the drum to a new word or number, left to right. Each
// cell's character is written from onUpdate as a pure function of progress (flapGlyphs). A line across each
// cell's middle gives the split look. Reduced motion: the board cuts to the new text.
export function splitFlap(ctx: Ctx, opts: SplitFlapOpts): SplitFlapHandle {
  const { x, y, cells, size = typeSize("title", 96) } = opts;
  const check = (s: string) => {
    if ([...s].length > cells) ctx.problem(`splitFlap: '${s}' has ${[...s].length} characters for ${cells} cells; the rest is cut`);
  };
  check(opts.text);
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-splitflap", "");
  Object.assign(root.style, { position: "absolute", left: `${x}px`, top: `${y}px`, display: "flex", gap: `${size * 0.08}px` });
  const glyphs = Array.from({ length: cells }, () => {
    const cell = root.appendChild(document.createElement("div"));
    Object.assign(cell.style, {
      position: "relative", width: `${size * 1.05}px`, height: `${size * 1.3}px`, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--k-surface)", border: "2px solid var(--k-line)", borderRadius: `${size * 0.08}px`, overflow: "hidden", // 1.05 em holds the widest advance (W, M) of every theme font; clip the rest
      font: `700 ${size}px/1 var(--k-font)`, color: "var(--k-fg)",
    });
    const g = cell.appendChild(document.createElement("span"));
    g.setAttribute("data-k-text", "");
    const fold = cell.appendChild(document.createElement("div"));
    Object.assign(fold.style, { position: "absolute", left: "0", right: "0", top: "50%", height: "2px", background: "var(--k-bg)" });
    return g;
  });
  const draw = (from: string, to: string, p: number) => flapGlyphs(from, to, p, cells).forEach((c, i) => (glyphs[i].textContent = c));
  root.setAttribute("aria-label", opts.text);
  draw(opts.text, opts.text, 1);
  gsap.set(root, { autoAlpha: 0 });
  let current = opts.text; // what the board shows after the steps added so far
  return {
    el: root,
    show(tl) {
      tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false });
    },
    to(text) {
      check(text);
      return (tl) => {
        const from = current; // read here, not when to() is called: adders may be built out of step order
        current = text;
        tl.to({}, {
          duration: ctx.reducedMotion ? motion.step : FLIP,
          ease: "none",
          onUpdate(this: gsap.core.Tween) {
            const p = this.progress();
            draw(from, text, ctx.reducedMotion ? (p > 0 ? 1 : 0) : p);
            root.setAttribute("aria-label", p > 0 ? text : from);
          },
        });
      };
    },
  };
}
