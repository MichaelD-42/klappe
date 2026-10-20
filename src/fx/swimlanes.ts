import type { Ctx, Rect, StepAdder } from "../types";

export type SwimlanesOpts = {
  lanes: { id: string; label: string }[];
  tasks: { id: string; lane: string; col: number; label: string }[];
  links: { from: string; to: string }[];
} & Rect;
export interface SwimlanesHandle {
  show: StepAdder;
  walk(taskId: string): StepAdder;
}

export function swimlanes(ctx: Ctx, opts: SwimlanesOpts): SwimlanesHandle {
  throw new Error("swimlanes: not built yet");
}
