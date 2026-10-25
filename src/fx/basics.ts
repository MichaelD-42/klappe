import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface FadeOpts {
  duration?: number; // seconds; default motion.step (0.6)
}
export interface TextOpts {
  text: string;
  x: number; // top-left corner, scene-local
  y: number;
  w: number; // the width the text wraps at
  size?: number; // font size in scene px; default 44, as a Markdown scene's text
  color?: string; // a theme token name; default "--k-fg"
  weight?: number; // default 400
}
export interface BasicHandle {
  el: HTMLElement;
  show: StepAdder;
}

// Fades the element (or list) in. It does not hide anything: build the element hidden
// (gsap.set(el, { autoAlpha: 0 }) in build; title and text do it). Hiding when the adder is made would
// run outside the timeline, so a seek and a play could differ.
export function show(el: Element | Element[], opts: FadeOpts = {}): StepAdder {
  return (tl) => void tl.to(el, { autoAlpha: 1, duration: opts.duration ?? motion.step });
}

// Fades the element (or list) out; autoAlpha 0 also sets visibility hidden, so it takes no clicks.
export function hide(el: Element | Element[], opts: FadeOpts = {}): StepAdder {
  return (tl) => void tl.to(el, { autoAlpha: 0, duration: opts.duration ?? motion.step });
}

// The scene title, styled and placed as a Markdown scene's (.k-scene h2), built hidden. A scene with
// build() gets no title from klappe; text defaults to the scene.md title.
export function title(ctx: Ctx, text?: string): BasicHandle {
  const el = ctx.html.appendChild(document.createElement("h2"));
  el.textContent = text ?? ctx.doc?.title ?? "";
  if (!el.textContent) ctx.problem("title: no text and no scene.md title");
  gsap.set(el, { autoAlpha: 0 });
  return { el, show: show(el) };
}

// A text box at a scene-local position, in a theme colour, built hidden.
export function text(ctx: Ctx, opts: TextOpts): BasicHandle {
  const { x, y, w, size = 44, weight = 400 } = opts;
  let color = opts.color ?? "--k-fg";
  if (!/^--k-[\w-]+$/.test(color)) {
    ctx.problem(`text: color "${color}" is not a --k-* token name`);
    color = "--k-fg";
  }
  const el = ctx.html.appendChild(document.createElement("div"));
  el.textContent = opts.text;
  Object.assign(el.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, width: `${w}px`,
    font: `${weight} ${size}px/1.35 var(--k-font)`, color: `var(${color})`,
  });
  gsap.set(el, { autoAlpha: 0 });
  return { el, show: show(el) };
}
