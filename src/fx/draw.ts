import { gsap } from "gsap";
import type { Ctx, StepAdder } from "../types";

export interface DrawOnOpts {
  duration?: number; // default 0.9
  each?: number; // default 0.06
  at?: gsap.Position; // where the draw starts on the timeline; default: the end
}
export interface LineArtOpts {
  src: string; // SVG file content, imported with ?raw
  x: number; // top-left corner of the drawing, scene-local
  y: number;
  w: number; // the viewBox maps to this width; the height follows the viewBox
}
export interface LineArtHandle {
  draw: StepAdder;
  glow(tl: gsap.core.Timeline, selector: string): void;
}

const SVG = "http://www.w3.org/2000/svg";
const SHAPES = "path,line,polyline,polygon,circle,rect,ellipse";
// Shapes in here are not drawn: they clip, mask or fill others.
const UNDRAWN = "defs, clipPath, mask, pattern, marker";

// The shapes in els and under them, in document order; text is left out.
function shapes(els: Element | ArrayLike<Element>): SVGGeometryElement[] {
  const out: SVGGeometryElement[] = [];
  for (const el of els instanceof Element ? [els] : Array.from(els))
    for (const s of [...(el.matches(SHAPES) ? [el] : []), ...el.querySelectorAll(SHAPES)])
      if (!s.closest("text") && !s.closest(UNDRAWN)) out.push(s as SVGGeometryElement);
  return out;
}

// Draws each shape from start to end, one after the other. It ends on a plain stroke, or on the
// shape's own dash and pathLength if it had a dash.
// The adder returns where the draw starts on the timeline (the end, with nothing to draw).
export function drawOn(els: Element | ArrayLike<Element>, opts: DrawOnOpts = {}): (tl: gsap.core.Timeline) => number {
  const { duration = 0.9, each = 0.06, at } = opts;
  const list = shapes(els);
  return (tl) => {
    if (!list.length) return tl.duration();
    // Sampled before the draw takes over the dash. Without a pathLength, the path's own length scales the dash the same way.
    // A plain stroke keeps pathLength 1, as before.
    const own = list.map((s) => {
      const dash = getComputedStyle(s).strokeDasharray;
      return { dash, len: dash === "none" ? "1" : (s.getAttribute("pathLength") ?? String(s.getTotalLength())) };
    });
    // With vector-effect non-scaling-stroke, Chromium applies the pathLength-normalised dash in
    // host units, so 1 is not the whole path: scale the dash by the shape's CTM scale k.
    // Dash 1.01k, gap 2k, offset 1.3k -> 0: hidden at the start, whole at the end. The advisor's 1.03k
    // let round caps of short strokes peek out as dots; 1.3k keeps the hidden dash 0.29 path lengths away.
    // k is sampled here, at load. The camera is a CSS transform and does not change k; k goes stale
    // only if a step tweens the transform of an SVG ancestor inside the scene before the draw.
    const ks = list.map((s) => {
      if (s.getAttribute("vector-effect") !== "non-scaling-stroke") return 1;
      const m = s.getCTM();
      return (m && Math.hypot(m.a, m.b)) || 1;
    });
    const dash = (i: number) => `${1.01 * ks[i]} ${2 * ks[i]}`;
    // autoRound off: GSAP rounds px to whole pixels, and the dash is in units of the path length.
    tl.fromTo(
      list,
      { strokeDasharray: dash, strokeDashoffset: (i: number) => 1.3 * ks[i], attr: { pathLength: 1 }, autoRound: false },
      { strokeDasharray: dash, strokeDashoffset: 0, attr: { pathLength: 1 }, duration, ease: "power1.inOut", stagger: each, autoRound: false },
      at,
    );
    const start = (tl.recent() as gsap.core.Tween).startTime();
    // A zero-length stroke (Lucide's "h.01" dots) is all round cap, which no dash offset hides:
    // it fades in at its slot instead.
    list.forEach((s, i) => {
      if (s.getTotalLength() < 0.5)
        tl.fromTo(s, { strokeOpacity: 0 }, { strokeOpacity: 1, duration: duration / 4 }, start + i * each);
    });
    const end = start + (list.length - 1) * each + duration;
    // In the timeline, not set directly: a seek back to before the draw restores pathLength 1 and the hidden dash.
    tl.set(list, { strokeDasharray: (i: number) => own[i].dash, attr: { pathLength: (i: number) => own[i].len } }, end);
    return start;
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
    // Exported SVGs can carry scripts, page-wide styles, handlers, animations that rewrite attributes and
    // links to other files: keep drawing content and in-file references (#id) only. Browsers ignore
    // whitespace and control characters inside a URL scheme, so they are dropped before the match.
    for (const e of svg.querySelectorAll("script, style, foreignObject, set, animate, animateMotion, animateTransform, image"))
      e.remove();
    for (const e of [svg, ...svg.querySelectorAll("*")])
      for (const a of [...e.attributes]) {
        const link = a.localName === "href" || a.localName === "src";
        const value = a.value.replace(/[\s\u0000-\u001f]/g, "");
        if (/^on/i.test(a.name) || /javascript:/i.test(value) || (link && !value.startsWith("#"))) e.removeAttributeNode(a);
      }
    g.append(...[...svg.childNodes].map((n) => document.importNode(n, true)));
  }
  Object.assign(g.style, { color: "var(--k-fg)" });
  // Inline style, so an exporter's inline fill or stroke cannot win; its stroke-width stays.
  for (const s of g.querySelectorAll<SVGElement>(SHAPES))
    if (!s.closest(UNDRAWN))
      Object.assign(s.style, { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" });
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
