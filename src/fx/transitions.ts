import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { TransitionKind } from "../types";
import { lazyTable } from "../lazy";

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
const STAGE = { w: 1920, h: 1080 };
// A canvas is a 0x0 box; its other scenes sit outside the frame. The clip keeps them off the stage while it moves.
const FRAME = `polygon(0 0, ${STAGE.w}px 0, ${STAGE.w}px ${STAGE.h}px, 0 ${STAGE.h}px)`;
const PUSH_TO: Record<string, { x: number; y: number }> = {
  left: { x: -STAGE.w, y: 0 },
  right: { x: STAGE.w, y: 0 },
  up: { x: 0, y: -STAGE.h },
  down: { x: 0, y: STAGE.h },
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
  return PUSH_TO[direction];
}

// The iris radius that just covers the frame from (x, y): the distance to the farthest corner.
export const irisRadius = (x: number, y: number): number => Math.hypot(Math.max(x, STAGE.w - x), Math.max(y, STAGE.h - y));

// The new canvas pushes the old one off the frame, both moving together.
const push: Transition = (from, to, opts) => {
  const { x, y } = pushOffset(opts.direction ?? "left");
  return gsap
    .timeline({ defaults: { duration: PUSH, ease: "power2.inOut" } })
    .set(from.el, { clipPath: FRAME })
    .set(to.el, { autoAlpha: 1, clipPath: FRAME, x: -x, y: -y })
    .to(from.el, { x, y }, 0)
    .to(to.el, { x: 0, y: 0 }, 0)
    .set(from.el, { autoAlpha: 0, clearProps: "transform,clipPath" })
    .set(to.el, { clearProps: "transform,clipPath" });
};

// A circle on top of the old canvas opens the new one from origin [x, y] in frame pixels (default the centre).
const iris: Transition = (from, to, opts) => {
  const o = opts.origin ?? [STAGE.w / 2, STAGE.h / 2];
  if (!Array.isArray(o) || o.length !== 2 || !o.every(Number.isFinite)) throw new Error(`iris: origin must be [x, y] in pixels`);
  const [x, y] = o as [number, number];
  const at = `at ${x}px ${y}px`;
  return gsap
    .timeline()
    .set(to.el, { autoAlpha: 1, zIndex: 1, clipPath: `circle(0px ${at})` })
    .to(to.el, { clipPath: `circle(${irisRadius(x, y)}px ${at})`, duration: IRIS, ease: "power2.inOut" })
    .set(from.el, { autoAlpha: 0 })
    .set(to.el, { clearProps: "zIndex,clipPath" });
};

// zoom, shatter and crt load only when a section asks for them: main.ts awaits loadTransitions first.
const table = lazyTable({
  zoom: () => import("./zoom").then((m) => m.transitionZoom as Transition),
  shatter: () => import("./shatter").then((m) => m.transitionShatter as Transition),
  crt: () => import("./crt").then((m) => m.transitionCrt as Transition),
});
const lazy = (kind: "zoom" | "shatter" | "crt"): Transition => (from, to, opts) => table.get(kind)(from, to, opts);

export const registry = {
  cut,
  fade,
  blackout,
  zoom: lazy("zoom"),
  shatter: lazy("shatter"),
  crt: lazy("crt"),
  push,
  iris,
} satisfies Record<TransitionKind, Transition>;

export async function loadTransitions(kinds: Iterable<TransitionKind>): Promise<void> {
  await table.load([...kinds].filter(table.has));
}

// A transition that throws (an effect not built yet, or a bug) falls back to fade, so the move still lands.
export function playTransition(
  kind: TransitionKind,
  from: CanvasRuntime,
  to: CanvasRuntime,
  opts: TransitionOpts,
): { kind: TransitionKind; tl: gsap.core.Timeline } {
  try {
    return { kind, tl: registry[kind](from, to, opts) };
  } catch (e) {
    console.error(`transition '${kind}': ${e instanceof Error ? e.message : e}; playing fade`);
    return { kind: "fade", tl: fade(from, to, opts) };
  }
}
