import type { gsap } from "gsap";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface DeckMeta {
  title: string;
  lang: string;
  theme: "calm" | "bold";
  intensity: "calm" | "bold";
  confidential: boolean;
  sharedCanvas: string[][];
}
export type StepKind =
  "step" | "shout-enter" | "shout-hold" | "shout-fade" | "shout-answer";
export interface StepDoc {
  text: string;
  notes: string;
  kind: StepKind;
}
export interface SceneDoc {
  id: string;
  order: number;
  title: string;
  notes: string;
  steps: StepDoc[];
}
export interface SectionDoc {
  id: string;
  order: number;
  title: string;
  notes: string;
}
export interface Ctx {
  rect: Rect;
  svg: SVGGElement;
  html: HTMLElement;
  canvas: { refs: Record<string, any>; rects: Record<string, Rect> };
  camera: {
    to(
      tl: gsap.core.Timeline,
      target: Rect,
      opts?: { duration?: number; at?: number | string },
    ): void;
  };
}
export type StepFn = (tl: gsap.core.Timeline, refs: any, ctx: Ctx) => void;
export interface SceneModule {
  place?(rects: Record<string, Rect>): Rect;
  build?(ctx: Ctx): any;
  steps?: (StepFn | null)[];
}
export interface SectionModule {
  build?(ctx: Omit<Ctx, "rect"> & { rect: Rect }): Record<string, any>;
}
export interface Scene extends SceneDoc {
  sectionId: string;
  module?: SceneModule;
  source: string;
}
export interface Section extends SectionDoc {
  scenes: Scene[];
  module?: SectionModule;
}
export interface Deck {
  meta: DeckMeta;
  sections: Section[];
}
export interface CanvasLayout {
  id: string;
  sectionIds: string[];
  size: { w: number; h: number };
  rects: Record<string, Rect>;
}
export interface StepAddr {
  index: number;
  canvas: number;
  section: string;
  scene: string;
  step: number;
}
export interface SelftestCheck {
  name: string;
  ok: boolean;
  detail?: string;
}
export interface SelftestResult {
  mode: string;
  ok: boolean;
  steps: number;
  checks: SelftestCheck[];
  problems: string[];
  errors: string[];
}
