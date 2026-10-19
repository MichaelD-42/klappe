import type { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { Ctx, StepAdder } from "../types";
import type { TransitionOpts } from "./transitions";

export interface CrtOpts {
  color?: "green" | "amber"; // default green
  lines: string[];
}
export interface CrtHandle {
  powerOn: StepAdder;
  type(tl: gsap.core.Timeline, line: number | "all"): void;
  ready: StepAdder;
}

export function crt(ctx: Ctx, opts: CrtOpts): CrtHandle {
  throw new Error("crt: not built yet");
}

export function transitionCrt(
  from: CanvasRuntime,
  to: CanvasRuntime,
  opts: TransitionOpts & { color?: "green" | "amber" },
): gsap.core.Timeline {
  throw new Error("transitionCrt: not built yet");
}
