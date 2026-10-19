import type { Ctx, StepAdder } from "../types";

export interface ShoutOpts {
  question: string;
  answer: string;
  intensity: "calm" | "bold";
}
export interface ShoutHandle {
  enter: StepAdder;
  hold: StepAdder;
  fade: StepAdder;
  answer: StepAdder;
}

export function shout(ctx: Ctx, opts: ShoutOpts): ShoutHandle {
  throw new Error("shout: not built yet");
}
