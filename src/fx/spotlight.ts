import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { measure } from "./measure";

export interface SpotlightOpts {
  dim?: number; // 0..1, how dark the scene goes around the hole; default 0.7
  pad?: number; // scene units between the target and the hole's edge; default 24
  shape?: "rect" | "circle"; // a rounded box round the target, or a circle round all of it; default "rect"
}
export interface SpotlightHandle {
  on(target: Element | Rect): StepAdder;
  off: StepAdder;
}

const RADIUS = 16;

// Dims the scene but for a hole around a target; on() again moves the hole, off() lifts the dim.
// The hole is a box whose huge shadow is the dim, clipped to the scene, with an --k-accent edge.
// Targets are measured when the step is added (see measure), so they must be in place by then.
export function spotlight(ctx: Ctx, opts: SpotlightOpts = {}): SpotlightHandle {
  const { dim = 0.7, pad = 24, shape = "rect" } = opts;
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-spotlight", "");
  Object.assign(root.style, { position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", zIndex: "5" });
  const hole = root.appendChild(document.createElement("div"));
  hole.setAttribute("data-k-spotlight-hole", "");
  Object.assign(hole.style, {
    position: "absolute", left: "0", top: "0", boxSizing: "border-box", borderRadius: shape === "circle" ? "50%" : `${RADIUS}px`,
    border: "3px solid var(--k-accent)",
    boxShadow: `0 0 0 ${ctx.rect.w + ctx.rect.h}px color-mix(in srgb, var(--k-blackout) ${Math.round(dim * 100)}%, transparent)`,
  });
  gsap.set(root, { autoAlpha: 0 });

  // Where the hole is at the end of the steps added so far; null while the dim is off.
  let at: { left: number; top: number; width: number; height: number } | null = null;
  return {
    on: (target) => (tl) => {
      const r = target instanceof Element ? measure(ctx, target) : target;
      if (!r) return ctx.problem("spotlight: target has no size to measure");
      // A circle through the target's corners, plus the pad.
      const d = Math.hypot(r.w, r.h) + 2 * pad;
      const to =
        shape === "circle"
          ? { left: r.x + r.w / 2 - d / 2, top: r.y + r.h / 2 - d / 2, width: d, height: d }
          : { left: r.x - pad, top: r.y - pad, width: r.w + 2 * pad, height: r.h + 2 * pad };
      // immediateRender off: a later step's start values must not apply at load.
      if (at) tl.fromTo(hole, at, { ...to, duration: motion.step * 1.5, ease: "power2.inOut", immediateRender: false });
      else {
        // Lands in place as the dim fades in: the same from and to, so a seek finds it there too.
        tl.fromTo(hole, to, { ...to, duration: motion.step, immediateRender: false });
        tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false }, "<");
      }
      at = to;
    },
    off: (tl) => {
      if (!at) return;
      tl.fromTo(root, { autoAlpha: 1 }, { autoAlpha: 0, duration: motion.step, immediateRender: false });
      at = null;
    },
  };
}
