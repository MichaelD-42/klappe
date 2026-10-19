import type { Ctx, StepAdder } from "../types";

export interface MorphOpts {
  from: Element;
  to: Element;
}
export interface BubbleOpts {
  x: number;
  y: number;
  text: string;
  side: "left" | "right";
}
export interface CounterOpts {
  x: number;
  y: number;
  from: number;
  to: number;
  label: string;
}

export function morph(ctx: Ctx, opts: MorphOpts): { play: StepAdder } {
  throw new Error("morph: not built yet");
}

export function bubble(ctx: Ctx, opts: BubbleOpts): { show: StepAdder; hide: StepAdder } {
  throw new Error("bubble: not built yet");
}

export function counter(ctx: Ctx, opts: CounterOpts): { run: StepAdder } {
  throw new Error("counter: not built yet");
}
