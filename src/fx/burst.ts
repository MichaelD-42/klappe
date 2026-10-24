import type { gsap } from "gsap";
import { rand } from "./swarm";
import type { Ctx } from "../types";

export interface BurstOpts {
  origin: { x: number; y: number }; // where the pieces pop from, scene px
  seed: number;
  count?: number; // default 150
  radius?: number; // how far the pieces fly, scene px; default 360
  duration?: number; // seconds; default 1.4
}
export interface BurstHandle {
  pop(tl: gsap.core.Timeline, at?: gsap.Position): void; // at: for example "<" to pop together with the tween before
}

const MAX_BACKING = 2560; // canvas side limit in device pixels, as swarm
const FADE = 0.3; // the pieces fade out over this last share of the pop
const GRAVITY = 0.25; // fall at the end, as a share of radius; with the 0.75 top speed, a piece stays within radius

// Piece i of a burst at progress p (0..1), relative to the origin, in units of radius. Pure: the same inputs give the same piece.
// It flies out at a seeded angle and speed, slows down (cubic ease-out), falls a little and spins.
export function burstPoint(seed: number, i: number, p: number): { x: number; y: number; rot: number; size: number } {
  const r = (k: number) => rand(seed, i, k);
  const t = Math.min(1, Math.max(0, p));
  const a = r(0) * 2 * Math.PI;
  const speed = 0.75 * (0.35 + 0.65 * r(1));
  const e = 1 - (1 - t) ** 3;
  return {
    x: Math.cos(a) * speed * e,
    y: Math.sin(a) * speed * e + GRAVITY * t * t,
    rot: r(2) * 2 * Math.PI + (r(3) - 0.5) * 4 * Math.PI * t,
    size: 8 + 8 * r(4),
  };
}

// Confetti that pops from a point once, for a milestone reached. Decoration: the canvas sits under data-k-ignore, so the
// self-test snapshot leaves it out; the picture is still a pure function of the tween's progress, so a seek matches play.
// Reduced motion: no canvas and no tween; pair the pop with a visible change in the same step.
export function burst(ctx: Ctx, opts: BurstOpts): BurstHandle {
  if (ctx.reducedMotion) return { pop: () => {} };
  const { origin, seed } = opts;
  const count = opts.count ?? 150;
  const R = opts.radius ?? 360;
  const duration = opts.duration ?? 1.4;
  const rect = { x: origin.x - R, y: origin.y - R, w: 2 * R, h: 2 * R };
  const canvas = document.createElement("canvas");
  canvas.setAttribute("data-k-ignore", "");
  canvas.setAttribute("data-k-burst", "");
  Object.assign(canvas.style, {
    position: "absolute",
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.w}px`,
    height: `${rect.h}px`,
    pointerEvents: "none",
  });
  // Device pixels per scene unit when the camera rests on this scene, capped so the backing store stays small (as swarm).
  const cam = Math.min(1920 / ctx.rect.w, 1080 / ctx.rect.h);
  const scale = Math.min((globalThis.devicePixelRatio || 1) * cam, MAX_BACKING / rect.w);
  canvas.width = Math.round(rect.w * scale);
  canvas.height = Math.round(rect.h * scale);
  ctx.html.append(canvas);
  const c2d = canvas.getContext("2d");

  // A pure function of p: the whole frame is redrawn from burstPoint. Empty at 0 and at 1.
  const draw = (p: number) => {
    canvas.setAttribute("data-k-progress", String(p));
    if (!c2d) return;
    c2d.setTransform(1, 0, 0, 1, 0, 0);
    c2d.clearRect(0, 0, canvas.width, canvas.height);
    if (p <= 0 || p >= 1) return;
    // Theme colours, read each frame of the pop only; before the stylesheet applies, the inherited text colour.
    const css = getComputedStyle(canvas);
    const accent = css.getPropertyValue("--k-accent").trim() || css.color;
    const series = [1, 2, 3, 4, 5, 6].map((n) => css.getPropertyValue(`--k-series-${n}`).trim()).filter(Boolean);
    const colors = series.length ? series : [accent];
    c2d.setTransform(scale, 0, 0, scale, R * scale, R * scale); // origin at the burst point
    c2d.globalAlpha = p < 1 - FADE ? 1 : (1 - p) / FADE;
    // One path per colour: piece i takes colour i mod n. Each piece is a rotated strip, size by size / 2.
    colors.forEach((color, k) => {
      c2d.fillStyle = color;
      c2d.beginPath();
      for (let i = k; i < count; i += colors.length) {
        const b = burstPoint(seed, i, p);
        const [cx, cy, c, s] = [b.x * R, b.y * R, Math.cos(b.rot), Math.sin(b.rot)];
        const [hw, hh] = [b.size / 2, b.size / 4];
        c2d.moveTo(cx + c * hw - s * hh, cy + s * hw + c * hh);
        c2d.lineTo(cx - c * hw - s * hh, cy - s * hw + c * hh);
        c2d.lineTo(cx - c * hw + s * hh, cy - s * hw - c * hh);
        c2d.lineTo(cx + c * hw + s * hh, cy + s * hw - c * hh);
        c2d.closePath();
      }
      c2d.fill();
    });
  };
  draw(0);

  return {
    pop(tl, at) {
      tl.to({}, {
        duration,
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          draw(this.progress());
        },
      }, at);
    },
  };
}
