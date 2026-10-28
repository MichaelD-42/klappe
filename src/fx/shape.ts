import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";
import { drawOn, token } from "./draw";

type P = { x: number; y: number };
// dash: a dashed stroke (it draws on solid, then shows its dashes); width: the stroke in scene px, at least 2.
type Line = { accent?: boolean; dash?: boolean; width?: number };
export type ShapeOpts = Line & (
  // fill: --k-surface inside, faded in once the outline has drawn; radius: the rect's corner radius.
  | { kind: "rect"; x: number; y: number; w: number; h: number; fill?: boolean; radius?: number } // top-left corner and size, scene-local
  | { kind: "circle"; x: number; y: number; r: number; fill?: boolean } // centre and radius
  | { kind: "line"; x: number; y: number; x2: number; y2: number }
);
export interface ArrowOpts extends Line {
  from: P;
  to: P; // the tip
  curve?: number; // bow, as a share of the length: 0.2 bends to the left of the way it points, -0.2 to the right; default 0
}
export interface ShapeHandle {
  el: SVGGElement;
  draw: StepAdder; // draws on stroke by stroke
  show: StepAdder; // fades in
}
export type TintProp = "color" | "fill" | "stroke" | "borderColor" | "backgroundColor";
export interface TintOpts {
  to: string; // a theme token, "--k-accent"
  prop?: TintProp; // default "color"
}

const SVG = "http://www.w3.org/2000/svg";
const HEAD = 20; // each head stroke's length
const SHAFT = 0.9; // seconds the shaft takes to draw on

// The arrow's shaft (a quadratic curve) and its head of two strokes, as path data.
export function arrowPath(from: P, to: P, curve = 0): { shaft: string; head: string } {
  const [dx, dy] = [to.x - from.x, to.y - from.y];
  // The control point sits off the midpoint, at right angles to the line (to the left of it on screen for curve > 0).
  const c = { x: (from.x + to.x) / 2 + dy * curve, y: (from.y + to.y) / 2 - dx * curve };
  const back = Math.atan2(c.y - to.y, c.x - to.x); // the tangent at the tip points from c to the tip
  const [a, b] = [-0.45, 0.45].map((d) => ({ x: to.x + HEAD * Math.cos(back + d), y: to.y + HEAD * Math.sin(back + d) }));
  const f = (p: P) => `${+p.x.toFixed(2)} ${+p.y.toFixed(2)}`;
  return { shaft: `M${f(from)} Q${f(c)} ${f(to)}`, head: `M${f(a)} L${f(to)} L${f(b)}` };
}

// A group of stroked SVG elements in --k-line (or --k-accent), hidden until its draw or show step.
function group(ctx: Ctx, kind: string, o: Line, parts: [string, Record<string, number | string>][]) {
  const g = document.createElementNS(SVG, "g");
  g.setAttribute("data-k-shape", "");
  let width = o.width ?? 4;
  if (width < 2) {
    ctx.problem(`${kind}: width ${width} is under the 2 px floor`);
    width = 2;
  }
  Object.assign(g.style, {
    fill: "none", stroke: o.accent ? "var(--k-accent)" : "var(--k-line)", strokeWidth: String(width), strokeLinecap: "round", strokeLinejoin: "round",
    ...(o.dash ? { strokeDasharray: `${3 * width} ${3 * width}` } : {}),
  });
  const els = parts.map(([tag, attrs]) => {
    const e = g.appendChild(document.createElementNS(SVG, tag));
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  });
  ctx.svg.append(g);
  gsap.set(g, { autoAlpha: 0 });
  return { g, els };
}

const show = (g: Element): StepAdder => (tl) => void tl.to(g, { autoAlpha: 1, duration: motion.step });

// A rectangle, circle or line on ctx.svg.
export function shape(ctx: Ctx, opts: ShapeOpts): ShapeHandle {
  const part: [string, Record<string, number>] =
    opts.kind === "rect"
      ? ["rect", { x: opts.x, y: opts.y, width: opts.w, height: opts.h }]
      : opts.kind === "circle"
        ? ["circle", { cx: opts.x, cy: opts.y, r: opts.r }]
        : ["line", { x1: opts.x, y1: opts.y, x2: opts.x2, y2: opts.y2 }];
  const { g, els } = group(ctx, "shape", opts, [part]);
  const el = els[0] as SVGElement;
  if (opts.kind === "rect" && opts.radius) el.setAttribute("rx", String(opts.radius));
  const fill = opts.kind !== "line" && opts.fill;
  if (fill) {
    el.style.fill = "var(--k-surface)";
    gsap.set(el, { fillOpacity: 0 });
  }
  return {
    el: g,
    draw(tl) {
      const start = drawOn(g)(tl);
      const end = tl.duration();
      tl.set(g, { autoAlpha: 1 }, start);
      if (fill) tl.to(el, { fillOpacity: 1, duration: motion.step }, end);
    },
    show(tl) {
      show(g)(tl);
      if (fill) tl.set(el, { fillOpacity: 1 }, "<");
    },
  };
}

// An arrow (connector) from one point to another, straight or bowed. The head draws on when the shaft arrives.
export function arrow(ctx: Ctx, opts: ArrowOpts): ShapeHandle {
  const d = arrowPath(opts.from, opts.to, opts.curve);
  const { g, els } = group(ctx, "arrow", opts, [["path", { d: d.shaft }], ["path", { d: d.head }]]);
  (els[1] as SVGElement).style.strokeDasharray = "none"; // a dashed arrow keeps a solid head
  // The head has no hidden dash before its own draw starts: it stays hidden until then.
  gsap.set(els[1], { autoAlpha: 0 });
  return {
    el: g,
    draw(tl) {
      const start = drawOn(els[0], { duration: SHAFT })(tl);
      tl.set(g, { autoAlpha: 1 }, start).set(els[1], { autoAlpha: 1 }, start + SHAFT - 0.1);
      drawOn(els[1], { duration: 0.3, at: start + SHAFT - 0.1 })(tl);
    },
    show(tl) {
      show(g)(tl);
      tl.set(els[1], { autoAlpha: 1 }, "<");
    },
  };
}

// The colour each tinted element and property holds after the tints added so far, in step order.
const tinted = new WeakMap<Element, Map<string, string>>();

// A step that tweens a colour property from its current colour to a theme token's colour. GSAP cannot tween
// var(): both ends are read as resolved colours when the step is added, at load. A second tint on the same
// element and property starts where the first ends.
export function tint(el: Element, opts: TintOpts, ctx?: Ctx): StepAdder {
  const prop = opts.prop ?? "color";
  return (tl) => {
    const seen = tinted.get(el) ?? new Map<string, string>();
    tinted.set(el, seen);
    const from = seen.get(prop) ?? getComputedStyle(el)[prop];
    // An unknown token resolves to "": the colour then stays as it is.
    let to = token(el, opts.to);
    if (!to) {
      ctx?.problem(`tint: unknown token '${opts.to}'`);
      to = from;
    }
    seen.set(prop, to);
    tl.fromTo(el, { [prop]: from }, { [prop]: to, duration: motion.step, immediateRender: false });
  };
}
