import type { Ctx, Rect, StepAdder } from "../types";

export type Row = Record<string, string | number>;
export type ChartType = "bar" | "stacked" | "line" | "waterfall" | "timeline";
export interface ChartOpts {
  src: string; // the data file, as in the Markdown link: "data/x.csv"
  data?: Row[] | null; // null: the file is missing
  type?: ChartType; // default bar
  rect: Rect;
  title?: string;
  sample?: boolean;
}
export interface ChartHandle {
  axes: StepAdder;
  grow: StepAdder;
  values: StepAdder;
}

export function chart(ctx: Ctx, opts: ChartOpts): ChartHandle {
  throw new Error("chart: not built yet");
}

export function parseCsv(text: string): Row[] {
  throw new Error("parseCsv: not built yet");
}
