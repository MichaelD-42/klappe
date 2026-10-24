import { gsap } from "gsap";
import { measure } from "./measure";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface GlowOpts {
  color?: string; // a theme token name; default "--k-accent"
}
export interface GlowHandle {
  on: StepAdder;
  breathe: StepAdder; // a slow loop for "this one is live"; steady with reduced motion
  off: StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const PAD = 16; // scene units between the target and the glow or ring box
const BREATH_MS = 1400; // one half of a breath: bright to dim

// An absolute box PAD around the target, in ctx.html. Measured when the first step is added (see measure).
function place(ctx: Ctx, box: HTMLElement, target: Element, what: string): boolean {
  const r = measure(ctx, target);
  if (!r) return (ctx.problem(`${what}: target has no size to measure`), false);
  Object.assign(box.style, { left: `${r.x - PAD}px`, top: `${r.y - PAD}px`, width: `${r.w + 2 * PAD}px`, height: `${r.h + 2 * PAD}px` });
  return true;
}

// A copy of an SVG target in the glow colour, without ids, classes or the draw-on's dash, so selectors and the draw skip it.
function shapeCopy(el: Element, color: string): SVGElement {
  const c = el.cloneNode(true) as SVGElement;
  for (const e of [c, ...c.querySelectorAll<SVGElement>("*")]) {
    e.removeAttribute("id");
    e.removeAttribute("class");
    Object.assign(e.style, { strokeDasharray: "", strokeDashoffset: "", strokeOpacity: "" });
  }
  // Thicker than the original, so the blur reads as light around the line, not a faint copy.
  Object.assign(c.style, { color, stroke: color, strokeWidth: String(3 * (parseFloat(getComputedStyle(el).strokeWidth) || 1)), filter: "blur(6px)" });
  return c;
}

// A soft light behind each target in a theme colour. Only opacity tweens; the blur is fixed at build (perf: docs/perf-m2.md).
// An HTML target gets a blurred box just before its top-level element in the scene, so it paints behind it.
// An SVG target gets a blurred copy of itself just before it. breathe loops on the wall clock, outside the
// timeline, on a leaf under data-k-ignore (as the crt blink does); the timeline only fades its layer in and out.
export function glow(ctx: Ctx, target: Element | ArrayLike<Element>, opts: GlowOpts = {}): GlowHandle {
  const color = `var(${opts.color ?? "--k-accent"})`;
  const steady: Element[] = [];
  const live: Element[] = [];
  const boxes: [HTMLElement, Element][] = [];
  for (const el of target instanceof Element ? [target] : Array.from(target)) {
    let wrap: Element, a: Element, b: Element, leaf: Element;
    if (el instanceof SVGElement) {
      wrap = el.parentNode!.insertBefore(document.createElementNS(SVG, "g"), el);
      a = wrap.appendChild(shapeCopy(el, color));
      b = wrap.appendChild(document.createElementNS(SVG, "g"));
      leaf = b.appendChild(shapeCopy(el, color));
    } else {
      let top = el;
      while (top.parentElement && top.parentElement !== ctx.html) top = top.parentElement;
      const box = ctx.html.insertBefore(document.createElement("div"), top.parentElement === ctx.html ? top : null);
      Object.assign(box.style, { position: "absolute", pointerEvents: "none" });
      const layer = (p: Element) => {
        const d = p.appendChild(document.createElement("div"));
        Object.assign(d.style, { position: "absolute", inset: "0", borderRadius: `${PAD}px`, background: color, filter: `blur(${PAD}px)` });
        return d;
      };
      wrap = box;
      a = layer(box);
      b = box.appendChild(document.createElement("div"));
      Object.assign((b as HTMLElement).style, { position: "absolute", inset: "0" });
      leaf = layer(b);
      boxes.push([box, el]);
    }
    wrap.setAttribute("data-k-glow", "");
    leaf.setAttribute("data-k-ignore", "");
    if (!ctx.reducedMotion)
      leaf.animate([{ opacity: 1 }, { opacity: 0.3 }], { duration: BREATH_MS, iterations: Infinity, direction: "alternate", easing: "ease-in-out" });
    steady.push(a);
    live.push(b);
  }
  gsap.set([...steady, ...live], { autoAlpha: 0 });

  let placed = false;
  let cur = { s: 0, l: 0 }; // the steady and the breathing layer's opacity at the end of the steps added so far
  const go = (s: number, l: number): StepAdder => (tl) => {
    if (!placed) for (const [box, el] of boxes) place(ctx, box, el, "glow");
    placed = true;
    // immediateRender off: a later step's start values must not apply at load.
    tl.fromTo(steady, { autoAlpha: cur.s }, { autoAlpha: s, duration: motion.step, immediateRender: false });
    tl.fromTo(live, { autoAlpha: cur.l }, { autoAlpha: l, duration: motion.step, immediateRender: false }, "<");
    cur = { s, l };
  };
  return { on: go(1, 0), breathe: go(0, 1), off: go(0, 0) };
}

// A ring in --k-accent around the target that grows and fades out once.
export function pulse(ctx: Ctx, target: Element): StepAdder {
  const ring = ctx.html.appendChild(document.createElement("div"));
  ring.setAttribute("data-k-pulse", "");
  Object.assign(ring.style, {
    position: "absolute", boxSizing: "border-box", border: "4px solid var(--k-accent)", borderRadius: `${PAD}px`, pointerEvents: "none", zIndex: "3",
  });
  gsap.set(ring, { autoAlpha: 0, scale: 1 });
  return (tl) => {
    if (!place(ctx, ring, target, "pulse")) return;
    tl.fromTo(ring, { autoAlpha: 1, scale: 1 }, { autoAlpha: 0, scale: 1.3, duration: motion.step * 1.2, ease: "power2.out", immediateRender: false });
  };
}

// Two quick side-to-side cycles that end where they began, for "this failed".
// shortcut: reads the target's x when the step is added, so an earlier step must not tween it; take x from that step if one ever does.
export function shake(target: Element): StepAdder {
  return (tl) => {
    const x = Number(gsap.getProperty(target, "x")) || 0;
    gsap.set(target, { x }); // written at load: a seek back to before the shake writes it too
    // The ease is the motion: two damped sine cycles that end at 0, so the tween ends at rest.
    tl.fromTo(target, { x }, { x: x + 14, duration: 0.5, ease: (p) => Math.sin(p * Math.PI * 4) * (1 - p), immediateRender: false });
  };
}
