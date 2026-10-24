import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { anchor } from "./callout";
import { drawOn } from "./draw";
import { lines, measure } from "./measure";

export type AnnotationKind = "circle" | "underline" | "box" | "strike" | "arrow" | "highlight";
export interface AnnotateOpts {
  kind: AnnotationKind;
  side?: "left" | "right" | "top" | "bottom"; // arrow: the side it comes from; default "left"
  pad?: number; // scene units between the target and the stroke; default 12
  seed?: number; // picks the wobble; default 1
}
export interface AnnotateHandle {
  show: StepAdder;
  hide: StepAdder;
}

type P = { x: number; y: number };
const SVG = "http://www.w3.org/2000/svg";
const ARROW = 160; // the arrow's length from its tail to the target edge
const HEAD = 22; // each head stroke's length
const MARKER = "color-mix(in srgb, var(--k-accent) 35%, transparent)"; // --k-fg on it holds 6.3:1 or more in every built-in theme

// mulberry32: a small seeded generator, so a stroke is the same on every load and in every test.
function random(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A run from a to b in n pieces, bowed to one side by up to `bow` at its middle, as a quick stroke is.
function line(a: P, b: P, n: number, bow: number, rnd: () => number): P[] {
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const [nx, ny] = [-(b.y - a.y) / len, (b.x - a.x) / len];
  const k = (rnd() - 0.5) * 2 * bow;
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const off = k * Math.sin(Math.PI * t);
    return { x: a.x + (b.x - a.x) * t + nx * off, y: a.y + (b.y - a.y) * t + ny * off };
  });
}

// The ring is a superellipse |x/rx|^4 + |y/ry|^4 = 1: a rounded loop, as a hand rings a line of text. An
// ellipse round a long flat line must be tall enough to swallow the lines above and below it.
const ROUND = 4;

// The margin m that puts the padded corners (±a, ±b) on the ring with radii a + m, b + m: the tightest
// ring with an even margin on both axes. Bisection on (a/(a+m))^4 + (b/(b+m))^4 = 1.
function margin(a: number, b: number): number {
  let [lo, hi] = [0, a + b];
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2;
    if ((a / (a + m)) ** ROUND + (b / (b + m)) ** ROUND > 1) lo = m;
    else hi = m;
  }
  return hi;
}

// The polylines of a hand-drawn mark around box, in drawing order. Pure, for tests.
export function scribble(kind: AnnotationKind, box: Rect, opts: { pad: number; seed: number; side?: AnnotateOpts["side"] }): P[][] {
  const rnd = random(opts.seed);
  const { pad } = opts;
  const [x0, y0, x1, y1] = [box.x - pad, box.y - pad, box.x + box.w + pad, box.y + box.h + pad];
  const cy = box.y + box.h / 2;
  if (kind === "circle") {
    // The tightest ring round the padded corners with an even margin, 6 % roomier so the drift never cuts a
    // corner, drawn 1.12 turns from upper left, its radius drifting a little as a hand's would.
    const [a, b] = [box.w / 2 + pad, box.h / 2 + pad];
    const m = margin(a, b) * 1.06;
    const [cx, rx, ry] = [box.x + box.w / 2, a + m, b + m];
    const n = 64;
    const start = -Math.PI * 0.6;
    const drift = 0.04 * (rnd() - 0.5);
    return [
      Array.from({ length: n + 1 }, (_, i) => {
        const t = start + (i / n) * 2 * Math.PI * 1.12;
        const k = 1 + drift * (i / n) + 0.015 * Math.sin(i * 0.9 + rnd() * 0.5);
        const [c, s] = [Math.cos(t), Math.sin(t)];
        return { x: cx + rx * k * Math.sign(c) * Math.abs(c) ** (2 / ROUND), y: cy + ry * k * Math.sign(s) * Math.abs(s) ** (2 / ROUND) };
      }),
    ];
  }
  if (kind === "underline") return [line({ x: x0, y: y1 + rnd() * 4 }, { x: x1, y: y1 + 4 + rnd() * 6 }, 16, 3, rnd)];
  // highlight: a near-level band through the middle, as a marker drags across; show makes it most of the line's height.
  if (kind === "highlight") return [line({ x: x0, y: cy + (rnd() - 0.5) * 8 }, { x: x1, y: cy + (rnd() - 0.5) * 8 }, 16, 3, rnd)];
  if (kind === "strike") return [line({ x: x0, y: cy + 4 - rnd() * 4 }, { x: x1, y: cy - 4 + rnd() * 4 }, 16, 3, rnd)];
  if (kind === "box") {
    // Four sides in one stroke; each corner overshoots a little, as a quick frame does.
    const o = () => 4 + rnd() * 6;
    const c = [
      { x: x0, y: y0 },
      { x: x1 + o(), y: y0 },
      { x: x1, y: y1 + o() },
      { x: x0 - o(), y: y1 },
      { x: x0, y: y0 - o() },
    ];
    return [c.slice(1).flatMap((b, i) => line(c[i], b, 8, 3, rnd).slice(i ? 1 : 0))];
  }
  // arrow: from ARROW out on its side to the padded edge, bowed a little, and a head of two strokes.
  const { from: edge, to: tail } = anchor({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, opts.side ?? "left", ARROW);
  const shaft = line(tail, edge, 12, 10, rnd);
  const back = Math.atan2(tail.y - edge.y, tail.x - edge.x);
  const head = [-0.45, 0.45].map((d) => [{ x: edge.x + HEAD * Math.cos(back + d), y: edge.y + HEAD * Math.sin(back + d) }, edge]);
  return [shaft, ...head];
}

// A hand-drawn mark on a target, in --k-accent: it draws on, then hide fades it out. It sits in its own SVG
// above the scene's HTML, so it can mark text; a highlight's SVG goes just before the target's top-level element
// instead, so it paints behind the text. An element target is measured by its content (its text, not
// the row it fills) when show is added (see measure).
export function annotate(ctx: Ctx, target: Element | Rect, opts: AnnotateOpts): AnnotateHandle {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("data-k-annotation", opts.kind);
  svg.setAttribute("width", String(ctx.rect.w));
  svg.setAttribute("height", String(ctx.rect.h));
  const hl = opts.kind === "highlight";
  Object.assign(svg.style, { position: "absolute", left: "0", top: "0", overflow: "visible", pointerEvents: "none", zIndex: hl ? "" : "4" });
  if (!hl) ctx.html.append(svg);
  else {
    // Positioned boxes paint in DOM order: before the target's top-level element is behind it (a rect: behind everything).
    let top = target instanceof Element ? target : null;
    while (top?.parentElement && top.parentElement !== ctx.html) top = top.parentElement;
    ctx.html.insertBefore(svg, top?.parentElement === ctx.html ? top : ctx.html.firstChild);
  }
  gsap.set(svg, { autoAlpha: 1 }); // the state hide() tweens from, so a fresh load matches a seek
  let shown = false;
  return {
    show(tl) {
      // An underline, a strike or a highlight follows each line of a wrapped target; the other marks frame it whole.
      const perLine = target instanceof Element && (opts.kind === "underline" || opts.kind === "strike" || hl);
      const box = target instanceof Element ? measure(ctx, target, true) : target;
      const boxes = perLine ? lines(ctx, target) : box ? [box] : [];
      if (!boxes.length) return ctx.problem(`annotate: ${opts.kind} target has no size to measure`);
      const seed = opts.seed ?? 1;
      const marks = boxes.flatMap((b, i) => scribble(opts.kind, b, { pad: opts.pad ?? 12, seed: seed + i, side: opts.side }).map((pts) => ({ pts, h: b.h })));
      const paths = marks.map(({ pts, h }) => {
        const p = document.createElementNS(SVG, "path");
        p.setAttribute("d", pts.map((q, i) => `${i ? "L" : "M"}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(" "));
        // A highlight band is most of its line's height, with butt ends: a round cap would reach into the next word.
        const stroke = hl ? { stroke: MARKER, strokeWidth: String(Math.round(h * 0.8)), strokeLinecap: "butt" } : { stroke: "var(--k-accent)", strokeWidth: "4", strokeLinecap: "round" };
        Object.assign(p.style, { fill: "none", strokeLinejoin: "round", ...stroke });
        return svg.appendChild(p);
      });
      drawOn(paths, { duration: opts.kind === "circle" ? 0.7 : 0.45, each: 0.12 })(tl);
      shown = true;
    },
    hide(tl) {
      if (!shown) return;
      tl.fromTo(svg, { autoAlpha: 1 }, { autoAlpha: 0, duration: motion.step, immediateRender: false });
    },
  };
}
