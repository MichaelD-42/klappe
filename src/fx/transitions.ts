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
