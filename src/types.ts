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
  theme: string;
  intensity: "calm" | "bold";
  confidential: boolean;
  sharedCanvas: string[][];
}
export type StepKind =
  "step" | "shout-enter" | "shout-fade" | "shout-answer";
// A step built from Markdown by an element: a code group, a console command, a task-list item, an agenda.
export type Part =
  | { kind: "code"; group: number } // index into SceneDoc.fence.groups
  | { kind: "console"; command: number } // index of the "$ " line among the commands
  | { kind: "check"; done: boolean }
  | { kind: "agenda"; rows: { from: string; to: string; title: string; current: boolean }[] };
export interface StepDoc {
  text: string;
  notes: string;
  kind: StepKind;
  // A media link in the step's list item; the link shows as its label in text.
  media?: { kind: "image" | "video" | "chart"; href: string; alt: string; title?: string };
  part?: Part;
}
export interface SceneDoc {
  id: string;
  order: number;
  title: string;
  notes: string;
  steps: StepDoc[];
  // The scene's one code or console block. groups: the highlight groups, line lists, 1-based.
  fence?: { lang: string; src: string; groups: number[][] };
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
  // scene: the current step's scene id.
  onStep(fn: (e: { play: boolean; span: [number, number] | null; scene: string | null }) => void): void;
  // Records a deck problem: shown on screen and fails the self-test.
  problem(msg: string): void;
  // The viewer asked for reduced motion: effects leave out decorative motion (Ken Burns).
  reducedMotion?: boolean;
  // The scene id, on a scene's ctx only.
  scene?: string;
  // The scene's parsed scene.md (title, notes, steps with their text), on a scene's ctx only:
  // read text from here instead of copying it into scene.ts.
  doc?: SceneDoc;
  // From deck.md: the language for effect words and number formats, and the shout-out intensity.
  deck: { lang: string; intensity: "calm" | "bold" };
}
// A helper's named step: adds tweens to the canvas timeline.
export type StepAdder = (tl: gsap.core.Timeline) => void;
export type StepFn = (tl: gsap.core.Timeline, refs: any, ctx: Ctx) => void;
// A full-frame picture from media/ behind the scene content. scrim: 0..1 dark layer for text on top.
// Pinned to the screen, under the content the camera moves. kenBurns: a slow push, once, from the first scene that shows it.
export interface Background {
  href: string;
  alt?: string; // describes the picture; a missing file then shows a prompt, and media/TODO.md gets one
  scrim?: number;
  kenBurns?: boolean;
}
export interface SceneModule {
  // Replaces the section's background while this scene is in view; the two cross-fade over the camera flight.
  background?: Background;
  place?(rects: Record<string, Rect>): Rect;
  build?(ctx: Ctx): any;
  steps?: (StepFn | null)[];
}
// The keys of the registry in src/fx/transitions.ts. A literal here keeps klappe/types free of imports.
export type TransitionKind = "cut" | "fade" | "blackout" | "zoom" | "shatter" | "crt";
export interface SectionModule {
  // Behind every scene of this section, pinned to the screen: the camera moves the content over it.
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
  // CSS by key: deck:<name>, repo:<name>, builtin:<name>.
  themes?: Record<string, string>;
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
