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
  on(target: Element | Rect | (Element | Rect)[]): StepAdder; // a list: one hole each, up to MAX_HOLES
  off: StepAdder;
}

const RADIUS = 16;
const MAX_HOLES = 4;

type Box = { left: number; top: number; width: number; height: number };

// Dims the scene but for holes around targets; on() again moves the holes, off() lifts the dim.
// The dim is one layer cut by an even-odd clip path with MAX_HOLES holes, the unused ones shrunk to a point, so
// a step tweens one path of a fixed shape; each hole has an --k-accent edge.
// Targets are measured when the step is added (see measure), so they must be in place by then.
export function spotlight(ctx: Ctx, opts: SpotlightOpts = {}): SpotlightHandle {
  const { dim = 0.7, pad = 24, shape = "rect" } = opts;
  const { w: W, h: H } = ctx.rect;
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-spotlight", "");
  Object.assign(root.style, { position: "absolute", inset: "0", overflow: "hidden", pointerEvents: "none", zIndex: "5" });
  const shade = root.appendChild(document.createElement("div"));
  Object.assign(shade.style, { position: "absolute", inset: "0", background: `color-mix(in srgb, var(--k-blackout) ${Math.round(dim * 100)}%, transparent)` });
  const holes = Array.from({ length: MAX_HOLES }, () => {
    const hole = root.appendChild(document.createElement("div"));
    hole.setAttribute("data-k-spotlight-hole", "");
    Object.assign(hole.style, {
      position: "absolute", left: "0", top: "0", boxSizing: "border-box", borderRadius: shape === "circle" ? "50%" : `${RADIUS}px`,
      border: "3px solid var(--k-accent)",
    });
    gsap.set(hole, { autoAlpha: 0 });
    return hole;
  });
  gsap.set(root, { autoAlpha: 0 });

  const r2 = (n: number) => Math.round(n * 100) / 100;
  // One hole's outline in the clip path: the same commands for every box, a point included, so tweens line up.
  const outline = (b: Box) => {
    const [x, y, w, h] = [b.left, b.top, b.width, b.height].map(r2);
    const r = r2(shape === "circle" ? w / 2 : Math.min(RADIUS, w / 2, h / 2));
    return shape === "circle"
      ? `M${x} ${r2(y + h / 2)}A${r} ${r} 0 1 0 ${r2(x + w)} ${r2(y + h / 2)}A${r} ${r} 0 1 0 ${x} ${r2(y + h / 2)}Z`
      : `M${r2(x + r)} ${y}H${r2(x + w - r)}A${r} ${r} 0 0 1 ${r2(x + w)} ${r2(y + r)}V${r2(y + h - r)}A${r} ${r} 0 0 1 ${r2(x + w - r)} ${r2(y + h)}` +
          `H${r2(x + r)}A${r} ${r} 0 0 1 ${x} ${r2(y + h - r)}V${r2(y + r)}A${r} ${r} 0 0 1 ${r2(x + r)} ${y}Z`;
  };
  const clip = (bs: Box[]) => `path(evenodd, "M0 0H${W}V${H}H0Z${bs.map(outline).join("")}")`;

  // Where the holes are at the end of the steps added so far; null while the dim is off.
  let at: Box[] | null = null;
  let lit = 0; // how many hole edges show; off() lifts the whole layer and leaves them as they are
  return {
    on: (target) => (tl) => {
      const list = Array.isArray(target) ? target : [target];
      if (list.length > MAX_HOLES) ctx.problem(`spotlight: ${list.length} targets; at most ${MAX_HOLES} holes`);
      const rs = list.slice(0, MAX_HOLES).map((t) => (t instanceof Element ? measure(ctx, t) : t));
      if (!rs.length || rs.some((r) => !r)) return ctx.problem("spotlight: target has no size to measure");
      const used = (rs as Rect[]).map((r): Box => {
        // A circle through the target's corners, plus the pad.
        const d = Math.hypot(r.w, r.h) + 2 * pad;
        return shape === "circle"
          ? { left: r.x + r.w / 2 - d / 2, top: r.y + r.h / 2 - d / 2, width: d, height: d }
          : { left: r.x - pad, top: r.y - pad, width: r.w + 2 * pad, height: r.h + 2 * pad };
      });
      // An unused hole shrinks to the middle of where it was, or of the first hole.
      const point = (b: Box): Box => ({ left: b.left + b.width / 2, top: b.top + b.height / 2, width: 0, height: 0 });
      const to = holes.map((_, k) => used[k] ?? point(at?.[k] ?? used[0]));
      // immediateRender off: a later step's start values must not apply at load.
      const d = at ? { duration: motion.step * 1.5, ease: "power2.inOut", immediateRender: false } : { duration: motion.step, immediateRender: false };
      const t = tl.duration();
      // A first on lands in place as the dim fades in: the same from and to, so a seek finds it there too.
      const from = at ?? to;
      tl.fromTo(shade, { clipPath: clip(from) }, { clipPath: clip(to), ...d }, t);
      holes.forEach((hole, k) => {
        tl.fromTo(hole, from[k], { ...to[k], ...d }, t);
        const [was, is] = [k < lit, k < used.length];
        if (was !== is) tl.fromTo(hole, { autoAlpha: was ? 1 : 0 }, { autoAlpha: is ? 1 : 0, duration: d.duration, immediateRender: false }, t);
      });
      if (!at) tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false }, t);
      at = to;
      lit = used.length;
    },
    off: (tl) => {
      if (!at) return;
      tl.fromTo(root, { autoAlpha: 1 }, { autoAlpha: 0, duration: motion.step, immediateRender: false });
      at = null;
    },
  };
}
