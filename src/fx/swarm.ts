import type { gsap } from "gsap";
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

export function swarm(ctx: Ctx, opts: SwarmOpts): SwarmHandle {
  throw new Error("swarm: not built yet");
}

// Object i of the swarm at progress p (0..1). Pure: the same inputs give the same point.
export function swarmPoint(seed: number, i: number, p: number): { x: number; y: number } {
  throw new Error("swarmPoint: not built yet");
}
