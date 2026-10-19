import type { gsap } from "gsap";
import type { Ctx, StepAdder } from "../types";

export interface DrawOnOpts {
  duration?: number; // default 0.9
  each?: number; // default 0.06
}
export interface LineArtOpts {
  src: string; // SVG file content, imported with ?raw
  x: number;
  y: number;
  w: number;
}
export interface LineArtHandle {
  draw: StepAdder;
  glow(tl: gsap.core.Timeline, selector: string): void;
}

export function drawOn(els: Element | ArrayLike<Element>, opts: DrawOnOpts = {}): StepAdder {
  throw new Error("drawOn: not built yet");
}

export function lineArt(ctx: Ctx, opts: LineArtOpts): LineArtHandle {
  throw new Error("lineArt: not built yet");
}
