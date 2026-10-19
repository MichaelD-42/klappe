import type { gsap } from "gsap";
import type { Rect } from "./types";
import { motion } from "./theme";

export interface Pose {
  x: number;
  y: number;
  scale: number;
}

const W = 1920;
const H = 1080;

export function frame(t: Rect): Pose {
  const scale = Math.min(W / t.w, H / t.h);
  return { x: -t.x * scale + (W - t.w * scale) / 2, y: -t.y * scale + (H - t.h * scale) / 2, scale };
}

export function flight(from: Rect, to: Rect): Pose[] {
  const [ax, ay] = [from.x + from.w / 2, from.y + from.h / 2];
  const [bx, by] = [to.x + to.w / 2, to.y + to.h / 2];
  const start = frame(from);
  const end = frame(to);
  if (Math.hypot(bx - ax, by - ay) <= 1.5 * Math.max(from.w, to.w)) return [start, end];
  // Mid rect spans both centres, padded by the larger rect so both stay in view.
  const [pw, ph] = [Math.max(from.w, to.w), Math.max(from.h, to.h)];
  const mid = frame({
    x: Math.min(ax, bx) - pw / 2,
    y: Math.min(ay, by) - ph / 2,
    w: Math.abs(bx - ax) + pw,
    h: Math.abs(by - ay) + ph,
  });
  return [start, mid, end];
}

export function addCameraMove(
  tl: gsap.core.Timeline,
  world: HTMLElement,
  from: Rect,
  to: Rect,
  opts: { duration?: number; at?: number | string; instant?: boolean } = {},
): void {
  const poses = flight(from, to).slice(1); // the camera is already at `from`
  // A cut is a set: keyframes of duration 0 make an empty nested timeline that a seek does not render.
  if (opts.instant) return void tl.set(world, frame(to), opts.at);
  const duration = opts.duration ?? motion.camera;
  tl.to(
    world,
    { keyframes: poses.map((p) => ({ ...p, duration: duration / poses.length, ease: "power2.inOut" })) },
    opts.at,
  );
}
