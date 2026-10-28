import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export type LayerStackOpts = {
  layers: { label: string; note?: string }[]; // the top layer first
} & Rect;
export interface LayerStackHandle {
  show: StepAdder; // the slabs build up from the bottom, stacked tight
  apart: StepAdder; // the slabs pull apart, the top one first, so each reads on its own
  light(i: number): StepAdder; // layer i (0 is the top) is outlined in the accent and its note shows; the one lit before goes back
  together: StepAdder; // the slabs close up again; nothing stays lit
}

const SVG = "http://www.w3.org/2000/svg";
const SLAB = 0.45; // the slabs' share of w; the labels take the rest, right of them
const MIN_T = 36; // a slab thinner than this cannot hold its label beside it
const FLOOR = 20; // legibility floor, scene px
const MAX_FONT = 28;
const NOTE_FONT = 22;
const LANES = 6; // one series colour each

// The slabs' geometry: a = half the slab width, c = half its top face's height, t = its thickness. together[i]
// and apart[i] are the top-face top vertex's y of layer i (0 is the top): touching and sitting on the rect's
// bottom, or spread with a gap of c over the whole height. Pure, for tests.
export function layerStackLayout(n: number, r: Rect) {
  const a = (r.w * SLAB) / 2;
  const c = Math.min(a / 2, r.h * 0.1);
  const t = (r.h - 2 * c - (n - 1) * c) / n;
  const problems = t < MIN_T ? [`layerStack: ${n} layers do not fit ${r.h}px; use fewer layers or a taller rect`] : [];
  const top0 = r.y + r.h - (n * t + 2 * c);
  const labelX = r.x + 2 * a + 48;
  return {
    a, c, t, problems, cx: r.x + a, labelX, labelW: r.x + r.w - labelX,
    together: Array.from({ length: n }, (_, i) => top0 + i * t),
    apart: Array.from({ length: n }, (_, i) => r.y + i * (t + c)),
  };
}

// "Our system in four layers": isometric slabs stacked tight, each in its series colour with its label to the
// right. apart pulls them open so each layer reads on its own, light points at one with its note, together
// closes the stack again.
export function layerStack(ctx: Ctx, opts: LayerStackOpts): LayerStackHandle {
  const n = opts.layers.length;
  if (!n) throw new Error("layerStack: no layers");
  const L = layerStackLayout(n, opts);
  L.problems.forEach((p) => ctx.problem(p));
  const { a, c, cx } = L;
  const t = Math.max(L.t, MIN_T);
  const pts = (q: number[][]) => q.map((p) => p.join(",")).join(" ");
  const poly = (g: Element, q: number[][], style: Partial<CSSStyleDeclaration>) => {
    const p = g.appendChild(document.createElementNS(SVG, "polygon"));
    p.setAttribute("points", pts(q));
    Object.assign(p.style, { strokeLinejoin: "round", ...style });
    return p;
  };
  const mix = (i: number, share: number) => `color-mix(in srgb, var(--k-series-${(i % LANES) + 1}) ${share}%, var(--k-surface))`;
  const root = ctx.svg.appendChild(document.createElementNS(SVG, "g"));
  const box = ctx.html.appendChild(document.createElement("div"));
  // Made bottom first, so a layer's front faces paint over the top face of the layer under it.
  const layers = opts.layers.map((l, i) => ({ l, i })).reverse().map(({ l, i }) => {
    const g = root.appendChild(document.createElementNS(SVG, "g"));
    g.setAttribute("data-k-layer", String(i));
    const edge = { stroke: "var(--k-bg)", strokeWidth: "2" };
    poly(g, [[cx - a, c], [cx, 2 * c], [cx, 2 * c + t], [cx - a, c + t]], { fill: mix(i, 45), ...edge });
    poly(g, [[cx, 2 * c], [cx + a, c], [cx + a, c + t], [cx, 2 * c + t]], { fill: mix(i, 30), ...edge });
    poly(g, [[cx, 0], [cx + a, c], [cx, 2 * c], [cx - a, c]], { fill: mix(i, 70), ...edge });
    const hot = poly(g, [[cx, 0], [cx + a, c], [cx + a, c + t], [cx, 2 * c + t], [cx - a, c + t], [cx - a, c]], { fill: "none", stroke: "var(--k-accent)", strokeWidth: "5" });
    const label = box.appendChild(document.createElement("div"));
    label.dataset.kLayerLabel = String(i);
    Object.assign(label.style, {
      position: "absolute", left: `${L.labelX}px`, top: "0", width: `${L.labelW}px`, whiteSpace: "nowrap", overflow: "hidden",
      color: "var(--k-fg)", font: `600 ${MAX_FONT}px/1.2 var(--k-font)`,
    });
    const name = label.appendChild(document.createElement("div"));
    name.textContent = l.label;
    Object.assign(name.style, { overflow: "hidden", textOverflow: "ellipsis" });
    const note = l.note ? box.appendChild(document.createElement("div")) : undefined;
    if (note) {
      note.textContent = l.note!;
      Object.assign(note.style, { position: "absolute", left: `${L.labelX}px`, top: "0", width: `${L.labelW}px`, color: "var(--k-muted)", font: `500 ${NOTE_FONT}px/1.3 var(--k-font)` });
      gsap.set(note, { autoAlpha: 0 });
    }
    // The label's middle level with the middle of the slab's right face; the note under it.
    const at = (y: number) => y + 1.5 * c + t / 2;
    gsap.set(g, { y: L.together[i], autoAlpha: 0 });
    gsap.set(label, { y: at(L.together[i]), yPercent: -50, autoAlpha: 0 });
    if (note) gsap.set(note, { y: at(L.together[i]) + MAX_FONT * 0.6 + 6 });
    gsap.set(hot, { autoAlpha: 0 });
    return { i, g, hot, label, name, note, at };
  }).reverse();

  // Labels are fitted on first use: the layout exists by then, not while building.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    const over = (e: HTMLElement) => e.scrollWidth > e.clientWidth + 1;
    for (const { i, name, label } of layers) {
      for (let size = MAX_FONT; size >= FLOOR; size -= 2) {
        label.style.fontSize = `${size}px`;
        if (!over(name)) break;
      }
      if (over(name)) ctx.problem(`layerStack: label "${opts.layers[i].label}" too long`);
    }
  };

  let open = false; // after the steps added so far
  let lit = -1;
  const move = (tl: gsap.core.Timeline, ys: number[], t0 = tl.duration()) => {
    layers.forEach((x, k) => {
      const d = { duration: motion.step, ease: "power2.inOut" };
      tl.to(x.g, { y: ys[x.i], ...d }, t0 + k * 0.08);
      tl.to(x.label, { y: x.at(ys[x.i]), ...d }, t0 + k * 0.08);
      if (x.note) tl.to(x.note, { y: x.at(ys[x.i]) + MAX_FONT * 0.6 + 6, ...d }, t0 + k * 0.08);
    });
  };
  const unlight = (tl: gsap.core.Timeline, at: number) => {
    if (lit < 0) return;
    const x = layers[lit];
    tl.to([x.hot, ...(x.note ? [x.note] : [])], { autoAlpha: 0, duration: motion.step }, at);
    lit = -1;
  };
  return {
    show(tl) {
      fit();
      const t0 = tl.duration();
      [...layers].reverse().forEach((x, k) => tl.to([x.g, x.label], { autoAlpha: 1, duration: 0.4 }, t0 + k * 0.12));
    },
    apart(tl) {
      if (open) return void tl.set({}, {}, tl.duration() + 0.4); // already apart: the step still takes a beat
      open = true;
      move(tl, L.apart);
    },
    light: (i) => (tl) => {
      if (!(i >= 0 && i < n)) return ctx.problem(`layerStack: no layer ${i}; the layers are 0 to ${n - 1}`);
      const at = tl.duration();
      if (i === lit) return void tl.set({}, {}, at + 0.4);
      unlight(tl, at);
      const x = layers[i];
      tl.to([x.hot, ...(x.note ? [x.note] : [])], { autoAlpha: 1, duration: motion.step }, at);
      lit = i;
    },
    together(tl) {
      const at = tl.duration();
      unlight(tl, at);
      if (!open) return void tl.set({}, {}, at + 0.4);
      open = false;
      move(tl, L.together, at);
    },
  };
}
