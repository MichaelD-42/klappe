import { gsap } from "gsap";
import { MARKER_MIX } from "./annotate";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export type PyramidOpts = {
  layers: { id: string; label: string }[]; // bottom layer first: the order they build in
  shape?: "pyramid" | "stack"; // trapezoids narrowing upwards, or bars of one width; default "pyramid"
} & Rect;
export interface PyramidHandle {
  next(): StepAdder; // builds the next layer up
}
type P = { x: number; y: number };

const SVG = "http://www.w3.org/2000/svg";
const GAP = 8; // between layers
const TOP = 0.3; // a pyramid's top edge, as a share of its base
const PAD = 16; // a label's inset from its layer's sides
const FLOOR = 20; // legibility floor, scene px
const MAX_FONT = 28;
const FILL = `color-mix(in srgb, var(--k-accent) ${MARKER_MIX * 100}%, transparent)`;

const r2 = (n: number) => Math.round(n * 100) / 100;

// Each layer's corners (bottom left, bottom right, top right, top left) and its label box (the width of its
// narrower top edge, inset), bottom layer first. The layers fill the rect's height with a gap between them.
export function pyramidLayout(rect: Rect, n: number, shape: "pyramid" | "stack" = "pyramid"): { points: P[]; label: Rect }[] {
  const lh = (rect.h - (n - 1) * GAP) / n;
  const bottom = rect.y + rect.h;
  const top = shape === "stack" ? 1 : TOP;
  // Half the width at height y: the base's at the bottom of the rect, the top's at its top.
  const half = (y: number) => (rect.w / 2) * (1 - ((1 - top) * (bottom - y)) / rect.h);
  const cx = rect.x + rect.w / 2;
  return Array.from({ length: n }, (_, i) => {
    const [y0, y1] = [bottom - i * (lh + GAP), bottom - i * (lh + GAP) - lh];
    const [h0, h1] = [half(y0), half(y1)];
    const points = [{ x: cx - h0, y: y0 }, { x: cx + h0, y: y0 }, { x: cx + h1, y: y1 }, { x: cx - h1, y: y1 }].map((p) => ({ x: r2(p.x), y: r2(p.y) }));
    return { points, label: { x: r2(cx - h1 + PAD), y: r2(y1), w: r2(2 * h1 - 2 * PAD), h: r2(lh) } };
  });
}

// A test pyramid or a capability stack: layers built bottom-up, one per step; the newest in the accent.
export function pyramid(ctx: Ctx, opts: PyramidOpts): PyramidHandle {
  if (!opts.layers.length) throw new Error("pyramid: no layers");
  const geo = pyramidLayout(opts, opts.layers.length, opts.shape);
  const poly = (pts: P[], style: Partial<CSSStyleDeclaration>) => {
    const p = document.createElementNS(SVG, "polygon");
    p.setAttribute("points", pts.map((q) => `${q.x},${q.y}`).join(" "));
    Object.assign(p.style, { strokeLinejoin: "round", ...style });
    return p;
  };
  const layers = opts.layers.map((l, i) => {
    const { points, label } = geo[i];
    const g = ctx.svg.appendChild(document.createElementNS(SVG, "g"));
    g.setAttribute("data-k-pyramid-layer", l.id);
    g.append(poly(points, { fill: "var(--k-surface)", stroke: "var(--k-line)", strokeWidth: "2" }));
    // The accent look, over the plain one: shown while the layer is the newest.
    const hot = g.appendChild(poly(points, { fill: FILL, stroke: "var(--k-accent)", strokeWidth: "4" }));
    const el = ctx.html.appendChild(document.createElement("div"));
    Object.assign(el.style, {
      position: "absolute", boxSizing: "border-box", left: `${label.x}px`, top: `${label.y}px`, width: `${label.w}px`, height: `${label.h}px`,
      display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", color: "var(--k-fg)", font: `600 ${MAX_FONT}px/1.2 var(--k-font)`,
    });
    const text = el.appendChild(document.createElement("div"));
    text.textContent = l.label;
    gsap.set([g, el, hot], { autoAlpha: 0 });
    // The start of its growth, so a seek back before its step leaves what the build left.
    if (!ctx.reducedMotion) gsap.set(g, { scaleY: 0, transformOrigin: "50% 100%" });
    return { id: l.id, g, hot, el, text };
  });

  // Labels are fitted on first use: the layout exists by then, not while building.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    for (const { id, el, text } of layers) {
      let size = MAX_FONT;
      const over = () => text.scrollWidth > el.clientWidth + 1 || text.offsetHeight > el.clientHeight;
      for (; size > FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      el.style.fontSize = `${size}px`;
      if (over()) ctx.problem(`pyramid: label of "${id}" too long`);
    }
  };

  let built = 0; // layers built by the next() steps added so far
  return {
    next() {
      // The layer is picked when the step is added, not here: adders built out of step order still build bottom-up.
      return (tl) => {
        const i = built++;
        const layer = layers[i];
        if (!layer) {
          ctx.problem(`pyramid: next() past the top layer (${layers.length} layers)`);
          return void tl.set({}, {}, tl.duration() + 0.4); // the step still takes a beat
        }
        fit();
        const t = tl.duration();
        if (i > 0) tl.fromTo(layers[i - 1].hot, { autoAlpha: 1 }, { autoAlpha: 0, duration: motion.step, immediateRender: false }, t);
        tl.set(layer.hot, { autoAlpha: 1, immediateRender: false }, t);
        // Reduced motion: the layer fades in where it stands instead of growing up from its base.
        if (ctx.reducedMotion) tl.fromTo(layer.g, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false }, t);
        else
          tl.fromTo(layer.g, { autoAlpha: 0, scaleY: 0 }, { autoAlpha: 1, scaleY: 1, duration: motion.step, ease: "power2.out", immediateRender: false }, t);
        tl.fromTo(layer.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, t + 0.3);
      };
    },
  };
}
