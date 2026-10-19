import { icons, type IconNode } from "lucide";
import type { Ctx, StepAdder } from "../types";
import { drawOn } from "./draw";

export interface IconOpts {
  x: number;
  y: number;
  size?: number; // default 96
  color: string;
}
export interface IconTileOpts {
  x: number;
  y: number;
  size?: number; // default 96
  tone: string; // a theme token
}
export interface IconHandle {
  draw: StepAdder;
  light: StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const SHAPES = "path,line,polyline,polygon,circle,rect,ellipse";
const FALLBACK = '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 8l8 8M16 8l-8 8"/>';
const lucide = icons as unknown as Record<string, IconNode>;

// A Lucide glyph as SVG markup on its 24 grid. An unknown name records a problem and gives a crossed box.
export function iconGlyph(name: string, problem: (msg: string) => void): string {
  const key = name.replace(/(^|-)(\w)/g, (_, _dash, c: string) => c.toUpperCase()); // grid-2x2 -> Grid2x2
  if (!name || !Object.hasOwn(lucide, key)) {
    problem(`icon: unknown Lucide name '${name}'`);
    return FALLBACK;
  }
  return lucide[key].map(([tag, a]) => `<${tag} ${Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`).join("");
}

// A closed shape takes the tint.
const closed = (s: Element) =>
  s.localName === "path" ? /z\s*$/i.test(s.getAttribute("d") ?? "") : ["rect", "circle", "ellipse", "polygon"].includes(s.localName);

const el = (tag: string, attrs: Record<string, string | number>, parent: Element) => {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
};

// The advisor v2 glyph: 2 px non-scaling strokes, round caps and joins, a 0.2 tint inside closed shapes.
// The returned group has no transform (filters work in world units); x, y is the glyph centre.
function glyph(ctx: Ctx, parent: Element, name: string, x: number, y: number, size: number, color: string): IconHandle {
  const root = el("g", { class: "k-icon" }, parent);
  root.style.color = color;
  const k = size / 24;
  const inner = el("g", {
    transform: `translate(${x - size / 2} ${y - size / 2}) scale(${k})`,
    fill: "none",
    stroke: "currentColor",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  }, root);
  inner.innerHTML = iconGlyph(name, ctx.problem);
  const tinted: Element[] = [];
  for (const s of inner.querySelectorAll(SHAPES)) {
    s.setAttribute("vector-effect", "non-scaling-stroke");
    s.setAttribute("stroke-width", "2");
    if (closed(s)) s.setAttribute("fill", "currentColor"), tinted.push(s);
  }
  const strokes = drawOn(inner);
  let drawn = false;
  return {
    draw(tl) {
      drawn = true;
      strokes(tl);
      if (tinted.length) tl.fromTo(tinted, { fillOpacity: 0 }, { fillOpacity: 0.2, duration: 0.4 }, "-=0.3");
    },
    light(tl) {
      tl.fromTo(
        root,
        { filter: "drop-shadow(0 0 0px currentcolor)" },
        { filter: `drop-shadow(0 0 ${size / 8}px currentcolor)`, duration: 0.6, ease: "power2.out" },
      );
      // After a draw, rendering the start at load would undo the draw's hidden tint.
      if (tinted.length)
        tl.fromTo(tinted, { fillOpacity: 0.2 }, { fillOpacity: 0.45, duration: 0.6, immediateRender: !drawn }, "<");
    },
  };
}

// A Lucide icon centred at (x, y), scene-local, size wide.
export function icon(ctx: Ctx, name: string, opts: IconOpts): IconHandle {
  return glyph(ctx, ctx.svg, name, opts.x, opts.y, opts.size ?? 96, opts.color);
}

let tiles = 0;

// The icon tile centred at (x, y): a soft glow, a diagonal gradient well in the tone, a hairline edge,
// and the glyph in the foreground colour. tone: a theme token, "accent" or "--k-accent".
export function iconTile(ctx: Ctx, name: string, opts: IconTileOpts): IconHandle {
  const s = opts.size ?? 96;
  const [x0, y0, r] = [opts.x - s / 2, opts.y - s / 2, s / 12];
  let tone = opts.tone.startsWith("--") ? opts.tone : `--k-${opts.tone}`;
  if (!getComputedStyle(ctx.svg).getPropertyValue(tone).trim()) {
    ctx.problem(`iconTile: unknown tone '${opts.tone}'`);
    tone = "--k-accent";
  }
  const g = el("g", { class: "k-tile" }, ctx.svg);
  const id = `k-tile-well-${++tiles}`;
  const grad = el("linearGradient", { id, x1: 0, y1: 0, x2: 1, y2: 1 }, el("defs", {}, g));
  el("stop", { offset: 0, style: `stop-color: color-mix(in srgb, var(${tone}) 75%, var(--k-fg))` }, grad);
  el("stop", { offset: 1, style: `stop-color: color-mix(in srgb, var(${tone}) 50%, var(--k-bg))` }, grad);
  const glow = el("rect", { x: x0 + s * 0.06, y: y0 + s * 0.12, width: s * 0.88, height: s * 0.88, rx: r, opacity: 0.5 }, g);
  Object.assign((glow as SVGElement).style, { fill: `var(${tone})`, filter: `blur(${s / 8}px)` });
  const well = el("rect", { x: x0, y: y0, width: s, height: s, rx: r, fill: `url(#${id})` }, g);
  const edge = el("rect", {
    x: x0 + 0.5, y: y0 + 0.5, width: s - 1, height: s - 1, rx: r,
    fill: "none", "stroke-opacity": 0.35, "stroke-width": 1, "vector-effect": "non-scaling-stroke",
  }, g);
  (edge as SVGElement).style.stroke = "var(--k-fg)";
  const icon = glyph(ctx, g, name, opts.x, opts.y, s * 0.6, "var(--k-fg)");
  return {
    draw(tl) {
      tl.fromTo([well, edge], { opacity: 0 }, { opacity: 1, duration: 0.4 });
      tl.fromTo(glow, { opacity: 0 }, { opacity: 0.5, duration: 0.4 }, "<");
      icon.draw(tl);
    },
    light(tl) {
      icon.light(tl);
      tl.fromTo(glow, { opacity: 0.5 }, { opacity: 1, duration: 0.6, immediateRender: false }, "<");
    },
  };
}
