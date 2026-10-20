import type { Ctx, Part, StepAdder } from "../types";

export type AgendaRow = Extract<Part, { kind: "agenda" }>["rows"][number];
export interface AgendaOpts {
  rows: AgendaRow[];
  x: number;
  y: number;
  w: number;
  current?: string; // a row title; default: the row marked current
}
export interface AgendaHandle {
  show: StepAdder;
}

export function agenda(ctx: Ctx, opts: AgendaOpts): AgendaHandle {
  throw new Error("agenda: not built yet");
}
