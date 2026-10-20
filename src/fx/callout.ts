import type { Ctx, StepAdder } from "../types";

export interface CalloutOpts {
  target: Element | { x: number; y: number };
  text: string;
  side: "left" | "right" | "top" | "bottom";
  offset?: number;
}
export interface CalloutHandle {
  show: StepAdder;
}

export function callout(ctx: Ctx, opts: CalloutOpts): CalloutHandle {
  throw new Error("callout: not built yet");
}
