import type { Ctx, Rect, StepAdder } from "../types";

export interface FlowOpts {
  nodes: { id: string; label: string; col: number; row: number; icon?: string }[];
  edges: { from: string; to: string; label?: string }[];
  grid: Rect & { cols: number; rows: number };
}
export interface FlowHandle {
  show(ids?: string[]): StepAdder;
  highlight(ids: string[]): StepAdder;
  send(o: { path: string[]; count?: number; label?: string }): StepAdder;
  node(id: string): Element;
}

export function flow(ctx: Ctx, opts: FlowOpts): FlowHandle {
  throw new Error("flow: not built yet");
}
