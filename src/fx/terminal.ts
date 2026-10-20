import type { Ctx, StepAdder } from "../types";

export interface TerminalOpts {
  lines: string[]; // "$ " lines are commands, the rest their output
  x: number;
  y: number;
  w: number;
  h: number;
  prompt?: string;
}
export interface TerminalHandle {
  show: StepAdder;
  run(command: number): StepAdder;
}

export function terminal(ctx: Ctx, opts: TerminalOpts): TerminalHandle {
  throw new Error("terminal: not built yet");
}
