import type { gsap } from "gsap";
import type { Ctx, StepAdder } from "../types";

export interface FigureOpts {
  x: number;
  y: number;
  scale?: number; // default 1
  color: string;
}
export interface FigureHandle {
  appear: StepAdder;
  walk(tl: gsap.core.Timeline, path: SVGPathElement | string, opts: { duration: number }): void;
  gather(tl: gsap.core.Timeline, x: number, y: number): void;
}

export function figure(ctx: Ctx, opts: FigureOpts): FigureHandle {
  throw new Error("figure: not built yet");
}
