import type { Ctx, Rect, StepAdder } from "../types";

export type SequenceOpts = {
  actors: { id: string; label: string }[];
  messages: { from: string; to: string; text: string; reply?: boolean }[];
} & Rect;
export interface SequenceHandle {
  actors: StepAdder;
  message(i: number): StepAdder;
}

export function sequence(ctx: Ctx, opts: SequenceOpts): SequenceHandle {
  throw new Error("sequence: not built yet");
}
