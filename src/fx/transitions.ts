import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { TransitionKind } from "../types";

// What a section gives its entry transition: its transitionOptions plus target from zoomTarget.
export interface TransitionOpts {
  target?: string; // zoomTarget: a ref on the old canvas
  [key: string]: unknown;
}
// A standalone timeline the stepper awaits. It ends with `from` hidden and `to` shown.
export type Transition = (from: CanvasRuntime, to: CanvasRuntime, opts: TransitionOpts) => gsap.core.Timeline;

const FADE = 0.4;
const BLACK_HOLD = 0.3;

const cut: Transition = (from, to) => {
  gsap.set(from.el, { autoAlpha: 0 });
  gsap.set(to.el, { autoAlpha: 1 });
  return gsap.timeline();
};

const fade: Transition = (from, to) =>
  gsap
    .timeline()
    .to(from.el, { autoAlpha: 0, duration: FADE }, 0)
    .fromTo(to.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE }, 0);

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

// zoom, shatter and crt load only when a section asks for them: main.ts awaits loadTransitions first.
const loaders = {
  zoom: () => import("./zoom").then((m) => m.transitionZoom),
  shatter: () => import("./shatter").then((m) => m.transitionShatter),
  crt: () => import("./crt").then((m) => m.transitionCrt),
} satisfies Partial<Record<TransitionKind, () => Promise<Transition>>>;
type Lazy = keyof typeof loaders;
const loaded: Partial<Record<Lazy, Transition>> = {};
const lazy = (kind: Lazy): Transition => (from, to, opts) => {
  const f = loaded[kind];
  if (!f) throw new Error(`${kind}: not loaded`);
  return f(from, to, opts);
};

export const registry = {
  cut,
  fade,
  blackout,
  zoom: lazy("zoom"),
  shatter: lazy("shatter"),
  crt: lazy("crt"),
} satisfies Record<TransitionKind, Transition>;

export async function loadTransitions(kinds: Iterable<TransitionKind>): Promise<void> {
  await Promise.all(
    [...new Set(kinds)].filter((k): k is Lazy => k in loaders).map(async (k) => void (loaded[k] = await loaders[k]())),
  );
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
