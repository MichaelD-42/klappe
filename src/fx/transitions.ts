import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import { transitionCrt } from "./crt";
import { transitionShatter } from "./shatter";
import { transitionZoom } from "./zoom";

// What a section gives its entry transition (from section.ts).
export interface TransitionOpts {
  target?: string; // zoomTarget: a ref on the old canvas
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
    .set(back, { backgroundColor: "#000" })
    .to(from.el, { autoAlpha: 0, duration: FADE })
    .fromTo(to.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: FADE }, `+=${BLACK_HOLD}`)
    .set(back, { clearProps: "backgroundColor" });
};

export const registry = {
  cut,
  fade,
  blackout,
  zoom: transitionZoom,
  shatter: transitionShatter,
  crt: transitionCrt,
} satisfies Record<string, Transition>;
export type TransitionKind = keyof typeof registry;

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
