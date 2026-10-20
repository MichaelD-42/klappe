import type { Ctx, StepAdder } from "../types";

export interface TimerOpts {
  minutes: number;
  style: "bar" | "donut" | "ring" | "text";
  x: number;
  y: number;
  size: number;
  label?: string;
}
export interface TimerHandle {
  show: StepAdder;
}

export function timer(ctx: Ctx, opts: TimerOpts): TimerHandle {
  throw new Error("timer: not built yet");
}
