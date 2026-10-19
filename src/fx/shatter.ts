import type { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { Ctx, StepAdder } from "../types";
import type { TransitionOpts } from "./transitions";

export interface ShatterOpts {
  target: Element;
  impact?: { x: number; y: number };
  shards?: number; // default 30
  fall?: number; // default 1
  toViewer?: number; // default 0.25
  seed?: number;
}
export interface ShatterHandle {
  crack: StepAdder;
  crack2: StepAdder;
  fall: StepAdder;
}

export function shatter(ctx: Ctx, opts: ShatterOpts): ShatterHandle {
  throw new Error("shatter: not built yet");
}

export function transitionShatter(
  from: CanvasRuntime,
  to: CanvasRuntime,
  opts: TransitionOpts & { shards?: number; seed?: number },
): gsap.core.Timeline {
  throw new Error("transitionShatter: not built yet");
}
