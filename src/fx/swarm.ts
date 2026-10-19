import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect } from "../types";

export interface SwarmOpts {
  rect: Rect;
  count?: number; // default 2000
  from: Rect;
  to: Rect;
  seed: number;
}
export interface SwarmHandle {
  stream(tl: gsap.core.Timeline, opts: { duration: number }): void;
}

const UNIT: Rect = { x: 0, y: 0, w: 1, h: 1 };
const FLIGHT = 0.4; // each object flies for this share of the stream; start times spread over the rest
const MAX_BACKING = 4096; // canvas side limit in device pixels

// A seeded number in [0, 1) for object i, draw k. Integer hash, no state.
function rand(seed: number, i: number, k: number): number {
  let h = Math.imul(seed | 0, 0x9e3779b1) ^ Math.imul(i | 0, 0x85ebca77) ^ Math.imul(k + 1, 0xc2b2ae3d);
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Object i of the swarm at progress p (0..1). Pure: the same inputs give the same point.
// It starts at a seeded spot in from, leaves at a seeded time, and lands at a seeded spot in to,
// on a curve that stays inside the bounding box of from and to. Without rects both are the unit square.
export function swarmPoint(seed: number, i: number, p: number, from: Rect = UNIT, to: Rect = UNIT): { x: number; y: number } {
  const r = (k: number) => rand(seed, i, k);
  const s = { x: from.x + r(0) * from.w, y: from.y + r(1) * from.h };
  const e = { x: to.x + r(2) * to.w, y: to.y + r(3) * to.h };
  const x0 = Math.min(from.x, to.x);
  const y0 = Math.min(from.y, to.y);
  // Control point: a convex mix of the midpoint and a seeded spot in the bounding box, so the curve stays inside it.
  const c = {
    x: 0.6 * (s.x + e.x) / 2 + 0.4 * (x0 + r(4) * (Math.max(from.x + from.w, to.x + to.w) - x0)),
    y: 0.6 * (s.y + e.y) / 2 + 0.4 * (y0 + r(5) * (Math.max(from.y + from.h, to.y + to.h) - y0)),
  };
  const lin = Math.min(1, Math.max(0, (p - r(6) * (1 - FLIGHT)) / FLIGHT));
  const t = lin * lin * (3 - 2 * lin); // ease in and out
  const [a, b, d] = [(1 - t) * (1 - t), 2 * t * (1 - t), t * t];
  return { x: a * s.x + b * c.x + d * e.x, y: a * s.y + b * c.y + d * e.y };
}

export function swarm(ctx: Ctx, opts: SwarmOpts): SwarmHandle {
  const { rect, from, to, seed } = opts;
  const count = opts.count ?? 2000;
  const canvas = document.createElement("canvas");
  Object.assign(canvas.style, {
    position: "absolute",
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.w}px`,
    height: `${rect.h}px`,
    pointerEvents: "none",
  });
  // Device pixels per scene unit when the camera rests on this scene, capped so the backing store stays small.
  const cam = Math.min(1920 / ctx.rect.w, 1080 / ctx.rect.h);
  const scale = Math.min((globalThis.devicePixelRatio || 1) * cam, MAX_BACKING / Math.max(rect.w, rect.h));
  canvas.width = Math.round(rect.w * scale);
  canvas.height = Math.round(rect.h * scale);
  ctx.html.append(canvas);
  gsap.set(canvas, { autoAlpha: 0 });
  const c2d = canvas.getContext("2d");
  let colors: [string, string] | undefined;

  // A pure function of p: the whole frame is redrawn from swarmPoint.
  const draw = (p: number) => {
    canvas.setAttribute("data-k-progress", String(p));
    if (!c2d) return;
    if (!colors) {
      const css = getComputedStyle(canvas);
      const fg = css.getPropertyValue("--k-fg").trim();
      const accent = css.getPropertyValue("--k-accent").trim();
      if (fg) colors = [fg, accent || fg]; // empty before the stylesheet applies: draw in white this once
    }
    c2d.setTransform(scale, 0, 0, scale, -rect.x * scale, -rect.y * scale);
    c2d.clearRect(rect.x, rect.y, rect.w, rect.h);
    // Small document shapes; every 25th is a key fact in the accent colour.
    for (const [k, color] of [[1, colors?.[0] ?? "#fff"], [0, colors?.[1] ?? "#fff"]] as const) {
      c2d.fillStyle = color;
      c2d.globalAlpha = k ? 0.6 : 1;
      c2d.beginPath();
      for (let i = 0; i < count; i++) {
        if ((i % 25 === 0 ? 0 : 1) !== k) continue;
        const pt = swarmPoint(seed, i, p, from, to);
        c2d.rect(pt.x - 3, pt.y - 4, 6, 8);
      }
      c2d.fill();
    }
  };
  draw(0);

  return {
    stream(tl, { duration }) {
      tl.to(canvas, { autoAlpha: 1, duration: motion.step / 2 });
      tl.to({}, {
        duration,
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          draw(this.progress());
        },
      }, "<");
    },
  };
}
