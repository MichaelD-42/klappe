import type { gsap } from "gsap";
import type { Ctx, Rect, StepAdder } from "../types";

export interface Site {
  id: string;
  label: string;
  lon: number;
  lat: number;
}
export interface WorldMapOpts {
  rect: Rect;
  sites: Site[];
}
export interface WorldMapHandle {
  draw: StepAdder;
  site(tl: gsap.core.Timeline, id: string): void;
  arc(tl: gsap.core.Timeline, fromId: string, toId: string): void;
  zoomTo(tl: gsap.core.Timeline, id: string): void;
}

export function worldMap(ctx: Ctx, opts: WorldMapOpts): WorldMapHandle {
  throw new Error("worldMap: not built yet");
}
