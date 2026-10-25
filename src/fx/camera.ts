import { gsap } from "gsap";
import { frame } from "../camera";
import type { Ctx, Rect, StepAdder } from "../types";
import { measure } from "./measure";
import type { TravelHandle } from "./travel";

export interface FollowOpts {
  zoom?: number; // how much closer than the scene's view the camera holds the element; default 1.6
}

// The camera closes in on a travelling element and keeps it centred to the end of its move, then stays there.
// Add it after the travel's step adder, in the same step. It reads the travel's path at the move's progress, not the
// element's place: on a seek back GSAP renders a step's tweens in reverse order, so the element would still be stale.
export function follow(ctx: Ctx, mover: TravelHandle, opts: FollowOpts = {}): StepAdder {
  return (tl) => {
    const { point, duration, start } = mover;
    if (!point || start === undefined) return ctx.problem("follow: add the travel's step before follow, in the same step");
    const { x, y } = ctx.rect;
    ctx.camera.follow(tl, (t) => {
      const q = point(t);
      return { x: x + q.x, y: y + q.y };
    }, { duration, zoom: opts.zoom, at: start });
  };
}

const IMPACT_SHAKE = 0.4; // seconds
const DROP = 18; // canvas units of the first jolt down

// A short damped jolt of everything the camera shows, for "this landed". It moves the world's layers, not the world,
// so it does not fight the camera's pose. It starts when the step's tweens added so far end. Reduced motion: none.
export function impactShake(ctx: Ctx): StepAdder {
  return (tl) => {
    const world = ctx.html.closest(".k-world");
    if (!world) return ctx.problem("impactShake: the scene is not on a canvas");
    if (ctx.reducedMotion) return;
    const layers = Array.from(world.children);
    gsap.set(layers, { y: 0 }); // written at load: a seek back to before the shake writes it too
    // The ease is the motion: three damped half-waves that end at 0, so the tween ends exactly at rest.
    tl.fromTo(layers, { y: 0 }, { y: DROP, duration: IMPACT_SHAKE, ease: (p) => Math.sin(p * Math.PI * 3) * (1 - p) ** 2, immediateRender: false });
  };
}

export interface TiltOpts {
  deg?: number; // the lean at its peak, mid-flight; default 4
  duration?: number; // seconds of the flight; default the theme's camera time
}

// A camera flight to `to` (canvas units) that leans a little into its direction and lands flat, so a long flight
// feels less flat. Only this flight leans; the engine's flights between scenes do not. Reduced motion: a cut, no lean.
export function tilt(ctx: Ctx, to: Rect, opts: TiltOpts = {}): StepAdder {
  return (tl) => ctx.camera.to(tl, to, { tilt: opts.deg ?? 4, duration: opts.duration });
}

export interface DollyZoomOpts {
  target: Element; // holds its size and place on screen
  amount?: number; // how far the camera pulls back (and the background grows); 1 goes back to the scene's frame; default 1.6
  duration?: number; // seconds; default 2
}

const DOLLY = 2; // seconds
const EASE = "power2.inOut"; // the camera flight's ease (addCameraMove)
const dolly = new WeakMap<Element, number>(); // the amount at the end of the steps added so far, per scene

// The "vertigo" move, in 2D: the camera pulls back from the target while the target grows by as much, so it holds
// its size and place while the rest of the scene shrinks around it; the pinned background grows the other way.
// The world is flat, so three planes at three scales (target, scene, background) stand in for the perspective
// shift. The camera, the target's scale and the background's scale stay at the end; call it again with amount 1
// to go back. Reduced motion: a cut to the same end.
export function dollyZoom(ctx: Ctx, opts: DollyZoomOpts): StepAdder {
  return (tl) => {
    const { target, amount: b = 1.6, duration = DOLLY } = opts;
    const pinned = ctx.html.closest(".k-canvas")?.firstElementChild;
    const r = measure(ctx, target);
    if (!pinned || !r) return ctx.problem("dollyZoom: the target has no size to measure");
    const a = dolly.get(ctx.html) ?? 1;
    if (a === b) return;
    const first = !dolly.has(ctx.html);
    dolly.set(ctx.html, b);
    const { rect } = ctx;
    const c = { x: rect.x + r.x + r.w / 2, y: rect.y + r.y + r.h / 2 }; // the target's centre, in canvas units
    // The view k times the scene's frame, scaled about the target, so the target keeps its place on screen.
    const view = (k: number) => ({ x: c.x - (c.x - rect.x) * k, y: c.y - (c.y - rect.y) * k, w: rect.w * k, h: rect.h * k });
    ctx.camera.to(tl, view(b), { duration });
    // The background grows about the target's place on screen, with the camera on the scene's frame.
    const f = frame(rect);
    const pin = { transformOrigin: `${f.x + c.x * f.scale}px ${f.y + c.y * f.scale}px` };
    // An SVG target grows about its measured centre in scene units (the scene's group is the canvas offset):
    // "50% 50%" reads its bounding box when the tween first renders, which a play and a seek do at different times.
    // In both ends of each tween: a seek may render only the end, which would keep an origin from earlier.
    const about = target instanceof SVGElement ? { svgOrigin: `${r.x + r.w / 2} ${r.y + r.h / 2}` } : { transformOrigin: "50% 50%" };
    // Written at load: a seek back to before the first dolly writes these too, so the walk matches it.
    if (first) gsap.set(target, { scale: 1, ...about }), gsap.set(pinned, { scale: 1, ...pin });
    if (ctx.reducedMotion) {
      tl.set(target, { scale: b, ...about }, "<");
      return void tl.set(pinned, { ...pin, scale: b }, "<");
    }
    // The world's scale runs from 1/a to 1/b on the flight's ease e; the target's scale is its inverse, so the
    // product stays 1 all the way. Written as an ease on a tween from a to b.
    const e = gsap.parseEase(EASE);
    const hold = (p: number) => (1 / (1 / a + (1 / b - 1 / a) * e(p)) - a) / (b - a);
    tl.fromTo(target, { scale: a, ...about }, { scale: b, ...about, duration, ease: hold, immediateRender: false }, "<");
    tl.fromTo(pinned, { ...pin, scale: a }, { ...pin, scale: b, duration, ease: EASE, immediateRender: false }, "<");
  };
}
