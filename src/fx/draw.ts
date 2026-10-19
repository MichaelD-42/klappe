import { gsap } from "gsap";
import type { Ctx, StepAdder } from "../types";

export interface DrawOnOpts {
  duration?: number; // default 0.9
  each?: number; // default 0.06
}
export interface LineArtOpts {
  src: string; // SVG file content, imported with ?raw
  x: number;
  y: number;
  w: number;
}
export interface LineArtHandle {
  draw: StepAdder;
  glow(tl: gsap.core.Timeline, selector: string): void;
}

const SVG = "http://www.w3.org/2000/svg";
const SHAPES = "path,line,polyline,polygon,circle,rect,ellipse";

// The shapes in els and under them, in document order; text is left out.
function shapes(els: Element | ArrayLike<Element>): SVGGeometryElement[] {
  const out: SVGGeometryElement[] = [];
  for (const el of els instanceof Element ? [els] : Array.from(els))
    for (const s of [...(el.matches(SHAPES) ? [el] : []), ...el.querySelectorAll(SHAPES)])
      if (!s.closest("text")) out.push(s as SVGGeometryElement);
  return out;
}

// Draws each shape from start to end, one after the other, and ends on a plain stroke.
export function drawOn(els: Element | ArrayLike<Element>, opts: DrawOnOpts = {}): StepAdder {
  const { duration = 0.9, each = 0.06 } = opts;
  const list = shapes(els);
  return (tl) => {
    if (!list.length) return;
    // With vector-effect non-scaling-stroke, Chromium applies the pathLength-normalised dash in
    // host units, so 1 is not the whole path: scale the dash by the shape's CTM scale k.
    // Dash 1.01k, gap 2k, offset 1.3k -> 0: hidden at the start, whole at the end. The advisor's 1.03k
    // let round caps of short strokes peek out as dots; 1.3k keeps the hidden dash 0.29 path lengths away.
    // k is sampled here, at load; a camera move only scales the whole world, so it does not change k.
    const ks = list.map((s) => {
      s.setAttribute("pathLength", "1");
      if (s.getAttribute("vector-effect") !== "non-scaling-stroke") return 1;
      const m = s.getCTM();
      return (m && Math.hypot(m.a, m.b)) || 1;
    });
    const dash = (i: number) => `${1.01 * ks[i]} ${2 * ks[i]}`;
    const at = tl.duration();
    // autoRound off: GSAP rounds px to whole pixels, and the dash is in units of the path length.
    tl.fromTo(
      list,
      { strokeDasharray: dash, strokeDashoffset: (i: number) => 1.3 * ks[i], autoRound: false },
      { strokeDasharray: dash, strokeDashoffset: 0, duration, ease: "power1.inOut", stagger: each, autoRound: false },
      at,
    );
    tl.set(list, { strokeDasharray: "none" }, at + (list.length - 1) * each + duration);
  };
}

// The value of a theme token, for tweens: GSAP cannot tween to a var() string.
const token = (el: Element, name: string) => getComputedStyle(el).getPropertyValue(name).trim();

// A line drawing from an SVG file: its viewBox maps to w wide at (x, y), scene-local.
// Strokes take the theme's foreground colour (currentColor) with round caps and joins.
export function lineArt(ctx: Ctx, opts: LineArtOpts): LineArtHandle {
  const g = document.createElementNS(SVG, "g");
  ctx.svg.append(g);
  const doc = new DOMParser().parseFromString(opts.src, "image/svg+xml");
  const svg = doc.documentElement;
  const vb = (svg.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  if (svg.localName !== "svg" || doc.querySelector("parsererror") || vb.length !== 4 || !(vb[2] > 0))
    ctx.problem("lineArt: the source is not an SVG with a viewBox");
  else {
    const k = opts.w / vb[2];
    g.setAttribute("transform", `translate(${opts.x - vb[0] * k} ${opts.y - vb[1] * k}) scale(${k})`);
    g.setAttribute("stroke-width", svg.getAttribute("stroke-width") ?? "4");
    g.append(...[...svg.childNodes].map((n) => document.importNode(n, true)));
  }
  Object.assign(g.style, { color: "var(--k-fg)" });
  for (const s of g.querySelectorAll(SHAPES))
    for (const [k, v] of Object.entries({ fill: "none", stroke: "currentColor", "stroke-linecap": "round", "stroke-linejoin": "round" }))
      s.setAttribute(k, v);
  return {
    draw: drawOn(g),
    glow(tl, selector) {
      const els = g.querySelectorAll(selector);
      if (!els.length) return ctx.problem(`lineArt glow: nothing matches '${selector}'`);
      const [fg, warm] = [token(g, "--k-fg"), token(g, "--k-phosphor-amber")];
      // The start values equal the look at load, so rendering them at load changes nothing on screen.
      tl.fromTo(els, { color: fg }, { color: warm, duration: 0.5 });
      tl.fromTo(
        els,
        { filter: `drop-shadow(0 0 0px ${warm})` },
        { filter: `drop-shadow(0 0 22px ${warm})`, duration: 0.6, ease: "power2.out" },
        "<",
      );
    },
  };
}
