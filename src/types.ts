
export interface Point {
  x: number;
  y: number;
}
export interface Rect extends Point {
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
  safeArea?: [number, number, number, number]; // top, right, bottom, left in scene px; the walk warns about ink outside it
  tempo?: number; // deck.md tempo as a factor on the motion times: slow 1.4, normal 1, fast 0.75
}
export type StepKind =
  "step" | "shout-enter" | "shout-answer";
// A step built from Markdown by an element: a code group, a console command, a chat message, a task-list item, a table row,
// an agenda.
export type Part =
  | { kind: "code"; group: number } // index into SceneDoc.fence.groups
  | { kind: "console"; command: number } // index of the "$ " line among the commands
  | { kind: "chat"; message: number } // index of the message among the chat fence's non-empty lines
  | { kind: "check"; done: boolean; fail?: boolean } // fail: "- [!]", crossed on its step
  | { kind: "compare"; row: number } // index into SceneDoc.table.rows
  | { kind: "agenda"; rows: { from: string; to: string; title: string; current: boolean; icon?: string }[] };
export interface StepDoc {
  text: string;
  notes: string;
  kind: StepKind;
  // A media link in the step's list item; the link shows as its label in text.
  media?: { kind: "image" | "video" | "chart"; href: string; alt: string; title?: string; fallback?: string };
  part?: Part;
}
export interface SceneDoc {
  id: string;
  order: number;
  title: string;
  notes: string;
  steps: StepDoc[];
  // The scene's one code or console block. groups: the highlight groups, line lists, 1-based.
  fence?: { lang: string; src: string; groups: number[][]; avatars?: Record<string, string> }; // avatars: a chat fence's picture lines
  // The scene's one Markdown table, as compareTable reads it: ✓ ✔ true, ✗ ✘ false, ~ partly, other text as written.
  table?: { columns: string[]; rows: { label: string; cells: (boolean | string)[] }[] };
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
      // tilt: degrees of a 3D lean into the flight's direction, at its peak mid-flight; none by default, none
      // with reduced motion (the flight is a cut).
      opts?: { duration?: number; at?: number | string; tilt?: number },
    ): void;
    // Closes in on a moving point and keeps it centred: point(t) is where it is, in canvas units, at time share t
    // (0..1) of the move. zoom: how much closer than the current view; default 1.6. The camera stays there after.
    follow(
      tl: gsap.core.Timeline,
      point: (t: number) => Point,
      opts?: { duration?: number; at?: number | string; zoom?: number },
    ): void;
  };
  // The deck's data/ files (raw text) and media/ files (URL), keyed like the Markdown link: "data/x.csv".
  files: { data: Record<string, string>; media: Record<string, string> };
  // Called on every move. span: this step's start and end time on this canvas's timeline,
  // or null when the current step is on another canvas. play: the step plays (not a cut).
  // scene: the current step's scene id.
  // next: the scene of the step after this one (null at the end), for a helper that gets ready one step early.
  onStep(fn: (e: { play: boolean; span: [number, number] | null; scene: string | null; next?: string | null }) => void): void;
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
// A full-frame picture or video from media/, or a generated drift, behind the scene content. scrim: 0..1 --k-scrim
// layer for text on top. Pinned to the screen, under the content the camera moves. kenBurns: a slow push, once,
// from the first scene that shows it (pictures only).
export interface Background {
  href?: string; // a picture, or a .mp4 or .webm video that plays muted in a loop
  // Instead of href: "aurora", a slow drift of light in the theme's colours; or a function that draws into el
  // (the full stage, 1920x1080) and returns play and pause, for a background the deck makes itself.
  animate?: "aurora" | ((el: HTMLElement) => { play(): void; pause(): void });
  parallax?: boolean | number; // drifts a little with each camera flight, as a far layer does; a number is its depth (true is 1, up to 4)
  // Pictures with transparent parts stacked over this one, each drifting by its own depth: a near layer (2, 3) moves
  // further than the far background (1), so the frame reads as several planes.
  layers?: { href: string; alt?: string; parallax: number }[];
  alt?: string; // describes the picture; a missing file then shows a prompt, and media/TODO.md gets one
  scrim?: number;
  scrimSide?: "left" | "right" | "top" | "bottom"; // full scrim on that side only, clear past the middle
  kenBurns?: boolean;
}
export interface SceneModule {
  // Replaces the section's background while this scene is in view; the two cross-fade over the camera flight.
  background?: Background;
  place?(rects: Record<string, Rect>): Rect;
  build?(ctx: Ctx): any;
  steps?: (StepFn | null)[];
  // Seconds to wait after a step's live forward play, then advance by itself. Lines up with steps. null: wait for input.
  auto?: (number | null)[];
  // The scene's button text in the overview, instead of its title.
  overviewLabel?: string;
}
// Where the deck is, for an overlay's update.
export interface OverlayAt {
  index: number; // the step's place in the whole deck, from 0
  total: number; // the deck's step count
  section: string; // ids
  scene: string;
  step: number; // the step in its scene, from 1
  sectionTitle: string;
  sceneTitle: string;
}
// decks/<id>/overlay.ts: content over every scene that the camera does not move (a logo, a frame, a chapter label).
export interface OverlayModule {
  // Makes the overlay's DOM once, in a 1920x1080 layer over the stage. Effects that build in ctx.html work here.
  build(ctx: Ctx): any;
  // Called on every move, with where the deck lands: set the overlay to match, with gsap.set or styles, never a tween.
  // It must depend on at alone, so a jump shows what a play does.
  update?(at: OverlayAt, refs: any): void;
}
// The keys of the registry in src/fx/transitions.ts. A literal here keeps klappe/types free of imports.
export type TransitionKind = "cut" | "fade" | "blackout" | "zoom" | "shatter" | "crt" | "push" | "iris" | "glitch" | "cube" | "pageTurn" | "magicMove";
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
  // The section's name in the overview, instead of its title: the row title and the prefix of a repeated scene title.
  overviewLabel?: string;
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
  overlay?: OverlayModule; // the deck's overlay.ts
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
  auto?: number | null; // from SceneModule.auto
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
  warnings: string[]; // soft findings (safe area, clipped text): reported, never fail the self-test
}
