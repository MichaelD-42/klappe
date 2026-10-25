import { gsap } from "gsap";
import type { Ctx, StepAdder } from "../types";
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
