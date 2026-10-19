import type { gsap } from "gsap";
import type { registry } from "./fx/transitions";

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
  // A media link in the step's list item; the link shows as its label in text.
  media?: { kind: "image" | "video" | "chart"; href: string; alt: string; title?: string };
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
  // The deck's data/ files (raw text) and media/ files (URL), keyed like the Markdown link: "data/x.csv".
  files: { data: Record<string, string>; media: Record<string, string> };
  // Called on every move. span: this step's start and end time on this canvas's timeline,
  // or null when the current step is on another canvas. play: the step plays (not a cut).
  onStep(fn: (e: { play: boolean; span: [number, number] | null }) => void): void;
  // Records a deck problem: shown on screen and fails the self-test.
  problem(msg: string): void;
}
// A helper's named step: adds tweens to the canvas timeline.
export type StepAdder = (tl: gsap.core.Timeline) => void;
export type StepFn = (tl: gsap.core.Timeline, refs: any, ctx: Ctx) => void;
export interface SceneModule {
  place?(rects: Record<string, Rect>): Rect;
  build?(ctx: Ctx): any;
  steps?: (StepFn | null)[];
}
export interface SectionModule {
  // How the deck enters this section's canvas on a forward step. Default: fade.
  transition?: keyof typeof registry;
  // For transition 'zoom': the ref on the old canvas the camera dives into.
  zoomTarget?: string;
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
  files?: Ctx["files"];
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
