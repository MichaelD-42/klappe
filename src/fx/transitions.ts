import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { OwnTransition, TransitionKind } from "../types";
import { lazyTable } from "../lazy";
import { stage as STAGE } from "../theme";

// What a section gives its entry transition: its transitionOptions plus target from zoomTarget.
export interface TransitionOpts {
  target?: string; // zoomTarget: a ref on the old canvas
  [key: string]: unknown;
}
// A standalone timeline the stepper awaits. It ends with `from` hidden and `to` shown.
export type Transition = (from: CanvasRuntime, to: CanvasRuntime, opts: TransitionOpts) => gsap.core.Timeline;

const FADE = 0.4;
const BLACK_HOLD = 0.3;
const PUSH = 0.7;
const IRIS = 0.8;
// A canvas is a 0x0 box; its other scenes sit outside the frame. The clip keeps them off the stage while it moves.
const frameClip = () => `polygon(0 0, ${STAGE.w}px 0, ${STAGE.w}px ${STAGE.h}px, 0 ${STAGE.h}px)`;
const PUSH_TO: Record<string, () => { x: number; y: number }> = {
  left: () => ({ x: -STAGE.w, y: 0 }),
  right: () => ({ x: STAGE.w, y: 0 }),
  up: () => ({ x: 0, y: -STAGE.h }),
  down: () => ({ x: 0, y: STAGE.h }),
};

const cut: Transition = (from, to) => {
  gsap.set(from.el, { autoAlpha: 0 });
  gsap.set(to.el, { autoAlpha: 1 });
  return gsap.timeline();
};

// Out, then in, each over half of FADE: two section titles at the same spot never show on top of each other.
const fade: Transition = (from, to) =>
  gsap
    .timeline()
    .to(from.el, { autoAlpha: 0, duration: FADE / 2 }, 0)
    .fromTo(to.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE / 2 }, FADE / 2);

// The layer behind both canvases turns black while neither shows.
const blackout: Transition = (from, to) => {
  const back = from.el.parentElement;
  return gsap
    .timeline()
    .set(back, { backgroundColor: "var(--k-blackout)" })
    .to(from.el, { autoAlpha: 0, duration: FADE })
    .fromTo(to.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE }, `+=${BLACK_HOLD}`)
    .set(back, { clearProps: "backgroundColor" });
};

// Where the old canvas ends for a push; the new one starts at the opposite offset.
export function pushOffset(direction: unknown = "left"): { x: number; y: number } {
  if (typeof direction !== "string" || !Object.hasOwn(PUSH_TO, direction))
    throw new Error(`push: direction "${direction}" is not left, right, up or down`);
  return PUSH_TO[direction]();
}

// The iris radius that just covers the frame from (x, y): the distance to the farthest corner.
export const irisRadius = (x: number, y: number): number => Math.hypot(Math.max(x, STAGE.w - x), Math.max(y, STAGE.h - y));

// The new canvas pushes the old one off the frame, both moving together. "reveal" at 0: the first step plays
// while it moves in, so an empty new canvas does not slide in.
const push: Transition = (from, to, opts) => {
  const { x, y } = pushOffset(opts.direction ?? "left");
  const FRAME = frameClip();
  return gsap
    .timeline({ defaults: { duration: PUSH, ease: "power2.inOut" } })
    .addLabel("reveal", 0)
    .set(from.el, { clipPath: FRAME })
    .set(to.el, { autoAlpha: 1, clipPath: FRAME, x: -x, y: -y })
    .to(from.el, { x, y }, 0)
    .to(to.el, { x: 0, y: 0 }, 0)
    .set(from.el, { autoAlpha: 0, clearProps: "transform,clipPath" })
    .set(to.el, { clearProps: "transform,clipPath" });
};

// The old canvas with a hole of radius r at (x, y): the frame minus the circle, as an even-odd path.
export const irisHole = (x: number, y: number, r: number): string =>
  `path(evenodd, "M0 0H${STAGE.w}V${STAGE.h}H0Z M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z")`;

// A circle opens the new canvas from origin [x, y] in frame pixels (default the centre). The canvases are
// transparent, so the old one gets the matching hole: inside the circle only the new one shows.
// "reveal" at 0, as for push: the first step plays inside the opening circle.
const iris: Transition = (from, to, opts) => {
  const o = opts.origin ?? [STAGE.w / 2, STAGE.h / 2];
  if (!Array.isArray(o) || o.length !== 2 || !o.every(Number.isFinite)) throw new Error(`iris: origin must be [x, y] in pixels`);
  const [x, y] = o as [number, number];
  const clip = (r: number) => ({ to: `circle(${r}px at ${x}px ${y}px)`, from: irisHole(x, y, r) });
  const s = { r: 0 };
  // Plain style writes from the tweened radius: GSAP need not parse the path() string each frame.
  const draw = () => {
    const c = clip(s.r);
    to.el.style.clipPath = c.to;
    from.el.style.clipPath = c.from;
  };
  draw(); // now, as the set below shows the new canvas at once, before the first tick
  return gsap
    .timeline()
    .addLabel("reveal", 0)
    .set(to.el, { autoAlpha: 1 })
    .call(draw)
    .fromTo(s, { r: 0 }, { r: irisRadius(x, y), duration: IRIS, ease: "power2.inOut", onUpdate: draw, immediateRender: false })
    .set(from.el, { autoAlpha: 0, clearProps: "clipPath" })
    .set(to.el, { clearProps: "clipPath" });
};

// zoom, shatter, crt, glitch, cube, pageTurn and magicMove load only when a section asks for them: main.ts awaits loadTransitions first.
const table = lazyTable({
  zoom: () => import("./zoom").then((m) => m.transitionZoom as Transition),
  shatter: () => import("./shatter").then((m) => m.transitionShatter as Transition),
  crt: () => import("./crt").then((m) => m.transitionCrt as Transition),
  glitch: () => import("./glitch").then((m) => m.transitionGlitch as Transition),
  cube: () => import("./turn").then((m) => m.transitionCube as Transition),
  pageTurn: () => import("./turn").then((m) => m.transitionPageTurn as Transition),
  magicMove: () => import("./magic").then((m) => m.transitionMagicMove as Transition),
});
const lazy = (kind: "zoom" | "shatter" | "crt" | "glitch" | "cube" | "pageTurn" | "magicMove"): Transition => (from, to, opts) => table.get(kind)(from, to, opts);

export const registry = {
  cut,
  fade,
  blackout,
  zoom: lazy("zoom"),
  shatter: lazy("shatter"),
  crt: lazy("crt"),
  push,
  iris,
  glitch: lazy("glitch"),
  cube: lazy("cube"),
  pageTurn: lazy("pageTurn"),
  magicMove: lazy("magicMove"),
} satisfies Record<TransitionKind, Transition>;

export async function loadTransitions(kinds: Iterable<TransitionKind>): Promise<void> {
  await table.load([...kinds].filter(table.has));
}

// A transition that throws (an effect not built yet, or a bug) falls back to fade, so the move still lands.
// A deck's own function (OwnTransition) reports as "custom"; one that throws falls back to fade, as the built-ins do.
export function playTransition(
  kind: TransitionKind | OwnTransition,
  from: CanvasRuntime,
  to: CanvasRuntime,
  opts: TransitionOpts,
): { kind: TransitionKind | "custom"; tl: gsap.core.Timeline } {
  try {
    if (typeof kind !== "function") return { kind, tl: registry[kind](from, to, opts) };
    return { kind: "custom", tl: kind(from, to, opts) };
  } catch (e) {
    console.error(`transition '${typeof kind === "function" ? "own" : kind}': ${e instanceof Error ? e.message : e}; playing fade`);
    return { kind: "fade", tl: fade(from, to, opts) };
  }
}
