import type { Ctx, StepAdder } from "../types";
import { glow } from "./attention";

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
    // GSAP records each attribute before the fromTo and writes it back on a revert: a missing pathLength comes
    // back as "", which the browser rejects with a console error. own.len looks the same as no pathLength.
    list.forEach((s, i) => s.hasAttribute("pathLength") || s.setAttribute("pathLength", own[i].len));
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
export const token = (el: Element, name: string): string => getComputedStyle(el).getPropertyValue(name).trim();

// The type scale's defaults (styles.css). An effect writes its sizes as drawn at these.
const TYPE = { title: 88, body: 44, label: 28 };
// Read once per page: the theme is applied before any effect builds, and a build reads sizes in loops.
const scale: Partial<Record<keyof typeof TYPE, number>> = {};
const readScale = (role: keyof typeof TYPE) =>
  typeof getComputedStyle === "undefined" || !globalThis.document?.documentElement
    ? undefined
    : parseFloat(token(document.documentElement, `--k-size-${role}`)) / TYPE[role] || undefined;
// A font size in the theme's type scale: px as drawn at the default scale, times the role's token over its default
// (--k-size-label: 32px makes a 28 px label 32). Never under the 20 px legibility floor unless px already was.
// The tokens are read from :root, where themes and deck.css set them; without a DOM (unit tests) px is kept.
export const typeSize = (role: keyof typeof TYPE, px: number): number => {
  const k = (scale[role] ??= readScale(role));
  return k ? Math.max(Math.min(px, 20), px * k) : px;
};
// The same for a stylesheet, where the size is CSS.
export const typeCss = (role: keyof typeof TYPE, px: number): string =>
  `max(${Math.min(px, 20)}px, calc(var(--k-size-${role}) * ${px / TYPE[role]}))`;

// Exported SVGs can carry scripts, page-wide styles, handlers, animations that rewrite attributes and
// links to other files: keep drawing content and in-file references (#id) only. Browsers ignore
// whitespace and control characters inside a URL scheme, so they are dropped before the match.
// animated: keep <style> (the caller scopes it in a shadow root) without @import or outside url(), and the
// SMIL animations, but none that animates a link or a handler.
export function cleanSvg(svg: Element, animated: boolean): void {
  const drop = animated ? "script, foreignObject, image" : "script, style, foreignObject, set, animate, animateMotion, animateTransform, image";
  for (const e of svg.querySelectorAll(drop)) e.remove();
  for (const e of svg.querySelectorAll("set, animate, animateMotion, animateTransform"))
    if (/href$|^on/i.test(e.getAttribute("attributeName") ?? "")) e.remove();
  for (const s of svg.querySelectorAll("style"))
    s.textContent = (s.textContent ?? "").replace(/@import[^;]*;?/gi, "").replace(/url\(\s*(?!["']?#)[^)]*\)/gi, "none");
  for (const e of [svg, ...svg.querySelectorAll("*")])
    for (const a of [...e.attributes]) {
      const link = a.localName === "href" || a.localName === "src";
      const value = a.value.replace(/[\s\u0000-\u001f]/g, "");
      if (/^on/i.test(a.name) || /javascript:/i.test(value) || (link && !value.startsWith("#"))) e.removeAttributeNode(a);
    }
}

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
    cleanSvg(svg, false);
    g.append(...[...svg.childNodes].map((n) => document.importNode(n, true)));
  }
  Object.assign(g.style, { color: "var(--k-fg)" });
  // Inline style, so an exporter's inline fill or stroke cannot win; its stroke-width stays.
  for (const s of g.querySelectorAll<SVGElement>(SHAPES))
    if (!s.closest(UNDRAWN))
      Object.assign(s.style, { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round" });
  const glowing = new WeakSet<Element>();
  return {
    draw: drawOn(g),
    glow(tl, selector) {
      // Not a glow's own copies (or its wrap), which a tag selector matches too.
      const els = [...g.querySelectorAll(selector)].filter((e) => !e.closest("[data-k-glow]"));
      if (!els.length) return ctx.problem(`lineArt glow: nothing matches '${selector}'`);
      // A part that already glows keeps its glow: a repeat call adds nothing for it.
      const fresh = els.filter((e) => !glowing.has(e));
      if (!fresh.length) return;
      fresh.forEach((e) => glowing.add(e));
      const [fg, warm] = [token(g, "--k-fg"), token(g, "--k-warn")];
      // The shared glow in the warm colour, and the part itself turns warm with it.
      glow(ctx, fresh, { color: "--k-warn" }).on(tl);
      // The start values equal the look at load, so rendering them at load changes nothing on screen.
      tl.fromTo(fresh, { color: fg }, { color: warm, duration: 0.5 }, "<");
    },
  };
}
