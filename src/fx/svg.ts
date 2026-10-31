import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";
import { cleanSvg, drawOn, token } from "./draw";

export interface SvgOpts {
  src: string; // SVG file content, imported with ?raw
  x: number; // top-left corner of the drawing, scene-local
  y: number;
  w: number; // the viewBox maps to this width; the height follows the viewBox
  // The file's colours to theme tokens: { "#1f6feb": "accent" } paints #1f6feb as var(--k-accent).
  colors?: Record<string, string>;
}
export interface SvgHandle {
  el: SVGGElement;
  show(id?: string): StepAdder; // no id: the drawing without its layers; an id: that layer too
  draw(id: string): StepAdder; // the layer fades in while its strokes draw on
  light(id: string | null): StepAdder; // the part stays, the rest dims; null: all back
  dim(id: string): StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const PAINT = ["fill", "stroke", "stop-color"];
const KEEP = /^(none|currentcolor|transparent|inherit|url\(.*\))$/i; // not a colour to map
const DIM = 0.25;
const norm = (c: string) => c.trim().toLowerCase().replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/, "#$1$1$2$2$3$3");

// Full-colour art from an SVG file (Figma, Illustrator, Inkscape), its fills and strokes kept but painted with
// theme tokens: an element with a k-<token> class takes that token, any other colour the token `colors` maps it to.
// Top-level elements with an id are layers: hidden at load, shown per step by id. Colours without a token,
// a <style> block (dropped, as in lineArt) and a step naming a missing id are deck problems.
export function svg(ctx: Ctx, opts: SvgOpts): SvgHandle {
  const g = document.createElementNS(SVG, "g");
  g.dataset.kSvg = "";
  ctx.svg.append(g);
  const doc = new DOMParser().parseFromString(opts.src, "image/svg+xml");
  const root = doc.documentElement;
  const vb = (root.getAttribute("viewBox") ?? "").split(/[\s,]+/).map(Number);
  if (root.localName !== "svg" || doc.querySelector("parsererror") || vb.length !== 4 || !(vb[2] > 0))
    ctx.problem("svg: the source is not an SVG with a viewBox");
  else {
    if (root.querySelector("style")) ctx.problem("svg: <style> is dropped; export with presentation attributes");
    const k = opts.w / vb[2];
    g.setAttribute("transform", `translate(${opts.x - vb[0] * k} ${opts.y - vb[1] * k}) scale(${k})`);
    cleanSvg(root, false);
    g.append(...[...root.childNodes].map((n) => document.importNode(n, true)));
  }
  g.style.fill = "var(--k-fg)"; // a shape with no fill would be black
  const map = Object.fromEntries(Object.entries(opts.colors ?? {}).map(([c, t]) => [norm(c), t.replace(/^--k-/, "")]));
  const unmapped = new Set<string>();
  const missing = new Set<string>();
  const paint = (t: string) => {
    if (!token(document.documentElement, `--k-${t}`)) missing.add(t);
    return `var(--k-${t})`;
  };
  // The nearest k-<token> class on the element or an ancestor inside the drawing.
  const classToken = (e: Element | null): string | undefined => {
    for (; e && e !== g; e = e.parentElement) {
      const c = [...e.classList].find((c) => c.startsWith("k-"));
      if (c) return c.slice(2);
    }
  };
  for (const e of g.querySelectorAll<SVGElement>("*")) {
    const cls = classToken(e);
    for (const p of PAINT) {
      const v = e.style.getPropertyValue(p) || e.getAttribute(p);
      if (!v || KEEP.test(v.trim())) continue;
      const t = cls ?? map[norm(v)];
      if (t) e.style.setProperty(p, paint(t));
      else unmapped.add(norm(v));
    }
  }
  for (const c of unmapped) ctx.problem(`svg: colour ${c} has no token; add it to colors or give its element a k-<token> class`);
  for (const t of missing) ctx.problem(`svg: no token --k-${t}`);

  const parts = [...g.children].filter((e) => !["defs", "title", "desc"].includes(e.localName));
  const layers = parts.filter((e) => e.id);
  // Opacity set on every part at load, so a seek back to before a light or dim writes what play left.
  gsap.set(parts, { opacity: 1 });
  gsap.set([g, ...layers], { autoAlpha: 0 });
  const find = (id: string) => {
    const e = g.querySelector(`[id="${CSS.escape(id)}"]`);
    if (!e) ctx.problem(`svg: no element with id "${id}"`);
    return e;
  };
  const step = () => motion.step;
  return {
    el: g,
    show: (id) => (tl) => {
      const e = id === undefined ? null : find(id);
      tl.to(g, { autoAlpha: 1, duration: step() });
      if (e) tl.to(e, { autoAlpha: 1, duration: step() }, "<");
    },
    draw: (id) => (tl) => {
      const e = find(id);
      tl.to(g, { autoAlpha: 1, duration: step() });
      if (!e) return;
      tl.to(e, { autoAlpha: 1, duration: step() }, "<");
      drawOn(e, { at: "<" })(tl);
    },
    light: (id) => (tl) => {
      if (id === null) return void tl.to(parts, { opacity: 1, duration: step() });
      const e = find(id);
      if (!e) return;
      const keep = parts.find((p) => p.contains(e));
      tl.to(parts.filter((p) => p !== keep), { opacity: DIM, duration: step() });
      tl.to([keep, e], { opacity: 1, duration: step() }, "<");
    },
    dim: (id) => (tl) => {
      const e = find(id);
      if (e) tl.to(e, { opacity: DIM, duration: step() });
    },
  };
}
