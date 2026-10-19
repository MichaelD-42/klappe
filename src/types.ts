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
// A full-frame picture from media/ behind a scene's frame. scrim: 0..1 dark layer for text on top.
// kenBurns: a slow push on the scene's first step.
export interface Background {
  href: string;
  scrim?: number;
  kenBurns?: boolean;
}
export interface SceneModule {
  // Behind this scene's frame; replaces the section's background for this scene.
  background?: Background;
  place?(rects: Record<string, Rect>): Rect;
  build?(ctx: Ctx): any;
  steps?: (StepFn | null)[];
}
// The keys of the registry in src/fx/transitions.ts. A literal here keeps klappe/types free of imports.
export type TransitionKind = "cut" | "fade" | "blackout" | "zoom" | "shatter" | "crt";
export interface SectionModule {
  // Behind every scene of this section: one copy per scene frame, so camera moves stay correct.
  background?: Background;
  // How the deck enters this section's canvas on a forward step. Default: fade.
  transition?: TransitionKind;
  // For transition 'zoom': the ref on the old canvas the camera dives into.
  zoomTarget?: string;
  // Extra options for the transition, for example { shards: 20 } for shatter.
  transitionOptions?: Record<string, unknown>;
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
