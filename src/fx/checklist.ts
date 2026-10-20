import type { Ctx, StepAdder } from "../types";

export interface ChecklistOpts {
  items: { text: string; done?: boolean }[];
  x: number;
  y: number;
  w: number;
}
export interface ChecklistHandle {
  show: StepAdder;
  tick(i: number): StepAdder;
}

export function checklist(ctx: Ctx, opts: ChecklistOpts): ChecklistHandle {
  throw new Error("checklist: not built yet");
}
