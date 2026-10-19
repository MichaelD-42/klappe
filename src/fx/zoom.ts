import { gsap } from "gsap";
import type { CanvasRuntime } from "../render/world";
import type { Rect } from "../types";
import type { TransitionOpts } from "./transitions";

const STAGE = { w: 1920, h: 1080 };
const DIVE = 8; // magnification at the end of the dive
const DIVE_TIME = 0.9;
const IN_TIME = 0.6;
const OVERLAP = 0.15; // the new canvas starts growing this long before the dive ends
const FROM_SCALE = 0.6;

type Pose = { x: number; y: number; scale: number };
const pose = (el: HTMLElement): Pose => ({
  x: Number(gsap.getProperty(el, "x")),
  y: Number(gsap.getProperty(el, "y")),
  scale: Number(gsap.getProperty(el, "scale")),
});

// The world point the dive centres on: the centre of ref `target` (an element or a world Rect), else the frame centre.
function aim(from: CanvasRuntime, p: Pose, target?: string): { x: number; y: number } {
  const ref = target ? from.refs[target] : undefined;
  if (target && ref == null) console.error(`zoom: no ref '${target}' on the old canvas; diving into the frame centre`);
  if (ref instanceof Element) {
    const r = ref.getBoundingClientRect();
    const w = from.el.getBoundingClientRect();
    if (w.width > 0)
      return {
        x: ((r.left + r.width / 2 - w.left) / w.width) * from.layout.size.w,
        y: ((r.top + r.height / 2 - w.top) / w.height) * from.layout.size.h,
      };
  } else if (ref && ["x", "y", "w", "h"].every((k) => typeof ref[k] === "number")) {
    const r = ref as Rect;
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }
  return { x: (STAGE.w / 2 - p.x) / p.scale, y: (STAGE.h / 2 - p.y) / p.scale };
}

// The camera dives into the ref opts.target on the old canvas (or its frame centre), then the new canvas scales in.
// The grow scales the layer that holds all canvases, not `to`: the target step starts at "reveal" and may fly
// `to`'s camera at the same time. The old canvas keeps the pose the seek gave it: it is read first and set again.
export function transitionZoom(from: CanvasRuntime, to: CanvasRuntime, opts: TransitionOpts): gsap.core.Timeline {
  const a = pose(from.el);
  const p = aim(from, a, opts.target);
  const s = a.scale * DIVE;
  const dive = { x: STAGE.w / 2 - p.x * s, y: STAGE.h / 2 - p.y * s, scale: s };
  const worlds = from.el.parentElement!;
  const stage = worlds.parentElement!;
  const stageBg = getComputedStyle(stage).backgroundColor;
  // The stage turns black behind the scaled layer, then fades back to its colour while the new canvas grows.
  return gsap
    .timeline()
    .set(stage, { backgroundColor: "var(--k-blackout)" })
    .set(to.el, { autoAlpha: 0 })
    .to(from.el, { ...dive, duration: DIVE_TIME, ease: "power2.in" }, 0)
    .to(from.el, { autoAlpha: 0, duration: DIVE_TIME * 0.25, ease: "power2.in" }, DIVE_TIME * 0.75)
    .addLabel("reveal", DIVE_TIME - OVERLAP) // the stepper starts the target step here
    .set(from.el, a, DIVE_TIME)
    // The dive point sits at the stage centre at the end of the dive; the new canvas grows out of that point.
    .fromTo(
      worlds,
      { scale: FROM_SCALE, transformOrigin: `${STAGE.w / 2}px ${STAGE.h / 2}px` },
      { scale: 1, duration: IN_TIME, ease: "power2.out", immediateRender: false },
      "reveal",
    )
    .fromTo(to.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: IN_TIME, ease: "power2.out" }, "reveal")
    .to(stage, { backgroundColor: stageBg, duration: IN_TIME, ease: "none" }, "reveal")
    .set(worlds, { clearProps: "transform,transformOrigin" })
    .set(stage, { clearProps: "backgroundColor" });
}
