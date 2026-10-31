import { gsap } from "gsap";
import { MARKER_MIX } from "./annotate";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { typeSize } from "./draw";
import { gapPx, strokeW } from "./layout";

export type ProcessStepsOpts = {
  steps: string[]; // the stage names, in order
  current?: number; // the stage lit when shown, 0-based; default 0
} & Rect;
export interface ProcessStepsHandle {
  show: StepAdder; // the chevrons fade in, the current one lit
  to(i: number): StepAdder; // lights stage i: the stages before it turn muted, the ones after it plain
}

const SVG = "http://www.w3.org/2000/svg";
const GAP = 10; // between chevrons
const PAD = 14; // a label's inset
const FLOOR = 20; // legibility floor, scene px
const MAX_FONT = 30;
const FILL = `color-mix(in srgb, var(--k-accent) ${MARKER_MIX * 100}%, var(--k-surface))`;
const colorOf = (i: number, cur: number) => (i < cur ? "var(--k-muted)" : "var(--k-fg)");

// The "step 2 of 5" bar of a process training: numbered chevrons across the rect, interlocking, the current
// one in the accent. Stages before it are muted, the ones after it plain.
export function processSteps(ctx: Ctx, opts: ProcessStepsOpts): ProcessStepsHandle {
  const n = opts.steps.length;
  if (!n) throw new Error("processSteps: no steps");
  const { x, y, w, h } = opts;
  const depth = Math.min(h * 0.35, 40); // how far a point reaches into the next chevron's notch
  const gap = gapPx(GAP);
  const cw = (w - depth - (n - 1) * gap) / n;
  let cur = opts.current ?? 0;
  if (!(cur >= 0 && cur < n)) {
    ctx.problem(`processSteps: no stage ${cur}; the stages are 0 to ${n - 1}`);
    cur = 0;
  }
  const poly = (pts: number[][], style: Partial<CSSStyleDeclaration>) => {
    const p = document.createElementNS(SVG, "polygon");
    p.setAttribute("points", pts.map((q) => q.join(",")).join(" "));
    Object.assign(p.style, { strokeLinejoin: "round", ...style });
    return p;
  };
  const root = ctx.svg.appendChild(document.createElementNS(SVG, "g"));
  const box = ctx.html.appendChild(document.createElement("div"));
  const stages = opts.steps.map((name, i) => {
    const x0 = x + i * (cw + gap);
    const pts = [
      [x0, y],
      [x0 + cw, y],
      [x0 + cw + depth, y + h / 2],
      [x0 + cw, y + h],
      [x0, y + h],
      ...(i ? [[x0 + depth, y + h / 2]] : []), // the first stage has a straight back
    ];
    const g = root.appendChild(document.createElementNS(SVG, "g"));
    g.setAttribute("data-k-stage", String(i));
    g.append(poly(pts, { fill: "var(--k-surface)", stroke: "var(--k-line)", strokeWidth: strokeW(2) }));
    const hot = g.appendChild(poly(pts, { fill: FILL, stroke: "var(--k-accent)", strokeWidth: strokeW(4) }));
    const left = x0 + (i ? depth : 0) + PAD;
    const el = box.appendChild(document.createElement("div"));
    Object.assign(el.style, {
      position: "absolute", boxSizing: "border-box", left: `${left}px`, top: `${y}px`, width: `${x0 + cw - PAD / 2 - left}px`, height: `${h}px`,
      display: "flex", alignItems: "center", gap: "0.4em", whiteSpace: "nowrap", color: colorOf(i, cur), font: `600 ${typeSize("label", MAX_FONT)}px/1.2 var(--k-font)`,
    });
    const num = el.appendChild(document.createElement("span"));
    num.textContent = String(i + 1);
    Object.assign(num.style, { fontWeight: "800", fontVariantNumeric: "tabular-nums" });
    const text = el.appendChild(document.createElement("span"));
    text.textContent = name;
    gsap.set(hot, { autoAlpha: i === cur ? 1 : 0 });
    return { name, el, hot };
  });
  gsap.set([root, box], { autoAlpha: 0 });

  // One font size for every label, fitted on first use: the layout exists by then, not while building.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    const over = () => stages.some(({ el }) => el.scrollWidth > el.clientWidth + 1);
    let size = typeSize("label", MAX_FONT);
    for (; size > FLOOR; size -= 2) {
      for (const { el } of stages) el.style.fontSize = `${size}px`;
      if (!over()) break;
    }
    for (const { el } of stages) el.style.fontSize = `${size}px`;
    const long = stages.find(({ el }) => el.scrollWidth > el.clientWidth + 1);
    if (long) ctx.problem(`processSteps: "${long.name}" does not fit its chevron at ${FLOOR}px; shorten it or widen the rect`);
  };

  let lit = cur; // the stage lit after the steps added so far, in step order
  return {
    show(tl) {
      fit();
      tl.to([root, box], { autoAlpha: 1, duration: motion.step });
    },
    to: (i) => (tl) => {
      if (!(i >= 0 && i < n)) return ctx.problem(`processSteps: no stage ${i}; the stages are 0 to ${n - 1}`);
      if (i === lit) return;
      const t = tl.duration();
      const d = { duration: motion.step, immediateRender: false };
      tl.fromTo(stages[lit].hot, { autoAlpha: 1 }, { autoAlpha: 0, ...d }, t);
      tl.fromTo(stages[i].hot, { autoAlpha: 0 }, { autoAlpha: 1, ...d }, t);
      stages.forEach(({ el }, k) => {
        if (colorOf(k, lit) !== colorOf(k, i)) tl.set(el, { color: colorOf(k, i), immediateRender: false }, t + motion.step / 2);
      });
      lit = i;
    },
  };
}
