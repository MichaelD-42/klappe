import { gsap } from "gsap";
import type { CameraPace, Rect } from "./types";
import { motion, stage } from "./theme";

export interface Pose {
  x: number;
  y: number;
  scale: number;
}

export function frame(t: Rect): Pose {
  const { w: W, h: H } = stage;
  const scale = Math.min(W / t.w, H / t.h);
  return { x: -t.x * scale + (W - t.w * scale) / 2, y: -t.y * scale + (H - t.h * scale) / 2, scale };
}

// How far a parallax background drifts from its rest, at most, in screen px, at depth 1; a layer at depth d drifts d
// times as far. Each is scaled up enough to hide its edges at its drift (parallaxScale).
export const PARALLAX = 40;
export const MAX_DEPTH = 4;
export const parallaxScale = (depth: number) => 1 + (2 * depth * PARALLAX) / Math.min(stage.w, stage.h);

// A parallax background's offset with the camera on rect `at` of a canvas of `size`: it drifts the way the
// content moves, PARALLAX at the canvas edges, so it reads as a far layer. Bounded, so it never shows an edge.
export function parallaxPose(at: Rect, size: { w: number; h: number }): { x: number; y: number } {
  const off = (c: number, half: number, span: number) => (span > 0 ? -PARALLAX * Math.max(-1, Math.min(1, (c - half) / span)) : 0);
  const [cx, cy] = [at.x + at.w / 2, at.y + at.h / 2];
  // Normalised by the reach of a scene centre: half the canvas less half a scene, so the outermost scenes drift the full PARALLAX.
  return { x: off(cx, size.w / 2, (size.w - at.w) / 2) || 0, y: off(cy, size.h / 2, (size.h - at.h) / 2) || 0 };
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

// How far into a follow (share of its time) the camera has closed in on the element; after that it holds it centred.
export const FOLLOW_LEAD = 0.3;

// The camera's view at time share t of a follow that starts on view `from`: it closes in from `from` to a box
// zoom times smaller centred on `pt` (world units), with a soft start and stop, then keeps `pt` centred.
export function followView(from: Rect, pt: { x: number; y: number }, zoom: number, t: number): Rect {
  const k = Math.min(1, t / FOLLOW_LEAD);
  const s = k * k * (3 - 2 * k);
  const [w, h] = [from.w / zoom, from.h / zoom];
  const mix = (a: number, b: number) => a + (b - a) * s;
  return { x: mix(from.x, pt.x - w / 2), y: mix(from.y, pt.y - h / 2), w: mix(from.w, w), h: mix(from.h, h) };
}

export function addCameraMove(
  tl: gsap.core.Timeline,
  world: HTMLElement,
  from: Rect,
  to: Rect,
  opts: CameraPace & { at?: number | string; instant?: boolean; tilt?: number } = {},
): void {
  // The camera is already at `from`. A whip pans straight there: no zoom out on the way.
  const poses = opts.whip ? [frame(to)] : flight(from, to).slice(1);
  // A cut is a set: keyframes of duration 0 make an empty nested timeline that a seek does not render.
  if (opts.instant) return void tl.set(world, frame(to), opts.at);
  const duration = flightTime(opts);
  const ease = flightEase(opts);
  tl.to(world, { keyframes: poses.map((p) => ({ ...p, duration: duration / poses.length, ease })) }, opts.at);
  if (opts.whip) whipBlur(tl, world, from, to, duration);
  if (opts.tilt) lean(tl, world.parentElement!, from, to, opts.tilt, duration);
}

const EASE = "power2.inOut";
const WHIP = { time: 0.3, ease: "expo.inOut", blur: 28 }; // a share of the flight time; the peak blur in screen px
export const flightTime = (o: CameraPace) => o.duration ?? (o.whip ? motion.camera * WHIP.time : motion.camera);
export const flightEase = (o: CameraPace) => (o.ease && gsap.parseEase(o.ease) ? o.ease : o.whip ? WHIP.ease : EASE);

// A whip's motion blur: a Gaussian blur along the flight's direction on the world, peaking mid-flight and 0 at
// both ends. Written from the tween's progress (onUpdate fires on a seek too), so seek equals play.
function whipBlur(tl: gsap.core.Timeline, world: HTMLElement, from: Rect, to: Rect, duration: number): void {
  const [dx, dy] = [to.x + to.w / 2 - (from.x + from.w / 2), to.y + to.h / 2 - (from.y + from.h / 2)];
  const len = Math.hypot(dx, dy);
  if (!len) return;
  const blur = blurFilter();
  tl.to(
    {},
    {
      duration,
      ease: "none",
      onUpdate(this: gsap.core.Tween) {
        const p = this.progress();
        const k = WHIP.blur * 4 * p * (1 - p);
        blur.setAttribute("stdDeviation", `${((k * Math.abs(dx)) / len).toFixed(1)} ${((k * Math.abs(dy)) / len).toFixed(1)}`);
        world.style.filter = k > 0.5 ? "url(#k-whip-blur)" : "";
      },
    },
    "<",
  );
}
// One shared filter: only one flight runs at a time.
function blurFilter(): SVGFEGaussianBlurElement {
  const NS = "http://www.w3.org/2000/svg";
  let f = document.querySelector<SVGFEGaussianBlurElement>("#k-whip-blur feGaussianBlur");
  if (f) return f;
  const svg = document.body.appendChild(document.createElementNS(NS, "svg"));
  Object.assign(svg.style, { position: "absolute", width: "0", height: "0" });
  svg.setAttribute("aria-hidden", "true");
  const filter = svg.appendChild(document.createElementNS(NS, "filter"));
  filter.id = "k-whip-blur";
  f = filter.appendChild(document.createElementNS(NS, "feGaussianBlur"));
  f.setAttribute("stdDeviation", "0 0");
  return f;
}

const LEAN_PERSPECTIVE = 1600; // px

// A 3D lean of the whole canvas into the flight's direction, peaking mid-flight at `deg` and exactly 0 at both ends.
// It turns the canvas (always the stage size), about the screen centre: the world's origin may be far off screen.
// The origin goes back to the canvas's own (0 0) at the end, which the zoom transition expects.
function lean(tl: gsap.core.Timeline, canvas: Element, from: Rect, to: Rect, deg: number, duration: number): void {
  const [dx, dy] = [to.x + to.w / 2 - (from.x + from.w / 2), to.y + to.h / 2 - (from.y + from.h / 2)];
  const len = Math.hypot(dx, dy);
  if (!len) return; // a pure zoom has no direction to lean into
  const at = (tl.recent() as gsap.core.Tween).startTime(); // the flight's start, not "<": a lean must never start before its step
  gsap.set(canvas, { rotationX: 0, rotationY: 0 }); // written at load: a seek back past the lean writes it too
  tl.set(canvas, { transformOrigin: `${stage.w / 2}px ${stage.h / 2}px`, transformPerspective: LEAN_PERSPECTIVE }, at);
  tl.set(canvas, { transformOrigin: "0px 0px", transformPerspective: 0 }, at + duration); // flat again, no 3D context
  // Added last, so a caller's "<" (the parallax drift, dollyZoom) still means the flight's start.
  tl.fromTo(
    canvas,
    { rotationX: 0, rotationY: 0 },
    // 4p(1-p): a hump that is exactly 0 at p = 0 and 1, so the flight lands flat.
    { rotationX: (-deg * dy) / len, rotationY: (deg * dx) / len, duration, ease: (p) => 4 * p * (1 - p), immediateRender: false },
    at,
  );
}
