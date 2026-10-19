import type { Ctx, StepAdder } from "../types";

export interface IconOpts {
  x: number;
  y: number;
  size?: number; // default 96
  color: string;
}
export interface IconTileOpts {
  x: number;
  y: number;
  size?: number; // default 96
  tone: string; // a theme token
}
export interface IconHandle {
  draw: StepAdder;
  light: StepAdder;
}

// name: a Lucide icon name.
export function icon(ctx: Ctx, name: string, opts: IconOpts): IconHandle {
  throw new Error("icon: not built yet");
}

export function iconTile(ctx: Ctx, name: string, opts: IconTileOpts): IconHandle {
  throw new Error("iconTile: not built yet");
}
