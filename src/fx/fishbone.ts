import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { typeSize } from "./draw";
import { radius, strokeW } from "./layout";

export type FishboneOpts = {
  effect: string; // the problem, in the head
  causes: { label: string; items?: string[] }[]; // the cause categories, each with its causes
} & Rect;
export interface FishboneHandle {
  show: StepAdder; // the head and the spine
  next(): StepAdder; // the next cause bone with its causes
  light(i: number | null): StepAdder; // puts a built bone in the accent: the root cause; null: none
}

const SVG = "http://www.w3.org/2000/svg";
const FONT = 24; // fixed in scene units: 17 px at 1366
const CHAR_W = 13; // about one character at FONT
const charW = () => (CHAR_W * typeSize("label", FONT)) / FONT; // follows the type scale
const LABEL_H = 56; // a category's box
const TICK = 36; // a cause's line off its bone

type P = { x: number; y: number };
export interface FishboneBone { label: string; top: boolean; base: P; end: P; items: { text: string; at: P }[] }
export interface FishboneLayout { head: Rect; spine: [P, P]; bones: FishboneBone[]; problem?: string }

// The Ishikawa diagram: the spine runs left to right into the head; bones slant back from the spine, alternating
// above and below, the first nearest the head. A bone's causes branch off it to the left, evenly along it.
export function fishboneLayout(opts: FishboneOpts): FishboneLayout {
  const { x, y, w, h, causes } = opts;
  const headW = Math.min(360, Math.max(200, opts.effect.length * charW() * 0.8 + 48), w * 0.25);
  const cy = y + h / 2;
  const head = { x: x + w - headW, y: cy - 70, w: headW, h: 140 };
  const spine: [P, P] = [{ x, y: cy }, { x: head.x, y: cy }];
  const m = Math.max(1, Math.ceil(causes.length / 2)); // bones per side
  const boneH = h / 2 - LABEL_H;
  const dx = boneH * 0.45;
  const slot = (head.x - x - dx) / m;
  let problem: string | undefined;
  const bones = causes.map((c, i) => {
    const top = i % 2 === 0;
    const k = m - 1 - Math.floor(i / 2); // the first pair nearest the head
    const base = { x: x + dx + (k + 1) * slot - 24, y: cy };
    const end = { x: base.x - dx, y: top ? cy - boneH : cy + boneH };
    const n = c.items?.length ?? 0;
    const items = (c.items ?? []).map((text, j) => {
      const f = (j + 1) / (n + 1);
      const at = { x: end.x + (base.x - end.x) * f, y: end.y + (base.y - end.y) * f };
      if (!problem && text.length * charW() + TICK + 12 > slot - 24)
        problem = `fishbone: "${text}" is too long for its bone; shorten it or use fewer causes`;
      return { text, at };
    });
    if (!problem && n && (boneH / (n + 1)) < typeSize("label", FONT) * 1.3) problem = `fishbone: ${n} causes on "${c.label}" do not fit its bone; use a taller rect`;
    return { label: c.label, top, base, end, items };
  });
  return { head, spine, bones, problem };
}

// A head with the effect, a spine into it, and one cause bone per next(); light(i) marks the root cause.
export function fishbone(ctx: Ctx, opts: FishboneOpts): FishboneHandle {
  const lay = fishboneLayout(opts);
  if (lay.problem) ctx.problem(lay.problem);
  const el = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
    const e = parent.appendChild(document.createElementNS(SVG, tag));
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };
  const text = (parent: Element, s: string, attrs: Record<string, string | number>) => {
    const t = el(parent, "text", { "font-size": typeSize("label", FONT), ...attrs });
    t.textContent = s;
    t.style.fill = "var(--k-fg)";
    return t;
  };
  const draw = (line: SVGElement) => gsap.set(line, { strokeDasharray: "1 1", strokeDashoffset: 1, autoRound: false });
  const root = el(ctx.svg, "g", { "data-k-fishbone": "" });

  const [a, b] = lay.spine;
  const spine = el(root, "line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, style: `stroke-width: ${strokeW(6)}`, "stroke-linecap": "round", pathLength: 1 });
  spine.style.stroke = "var(--k-fg)";
  draw(spine);
  const head = el(root, "g", {});
  const box = el(head, "rect", { x: lay.head.x, y: lay.head.y, width: lay.head.w, height: lay.head.h, style: `rx: ${radius(10)}; stroke-width: ${strokeW(4)}` });
  Object.assign(box.style, { fill: "var(--k-surface)", stroke: "var(--k-accent)" });
  const say = ctx.html.appendChild(document.createElement("div"));
  say.textContent = opts.effect;
  Object.assign(say.style, {
    position: "absolute", left: `${lay.head.x}px`, top: `${lay.head.y}px`, width: `${lay.head.w}px`, height: `${lay.head.h}px`,
    display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "0 16px", boxSizing: "border-box",
    color: "var(--k-fg)", font: `700 ${typeSize("label", 28)}px/1.2 var(--k-font)`, overflowWrap: "anywhere",
  });
  gsap.set([head, say], { autoAlpha: 0 });

  const bones = lay.bones.map((bn, i) => {
    const g = el(root, "g", { "data-k-bone": String(i) });
    const line = el(g, "line", { x1: bn.base.x, y1: bn.base.y, x2: bn.end.x, y2: bn.end.y, style: `stroke-width: ${strokeW(4)}`, "stroke-linecap": "round", pathLength: 1 });
    line.style.stroke = "var(--k-muted)";
    draw(line);
    const w = bn.label.length * charW() + 32;
    const ly = bn.top ? bn.end.y - LABEL_H : bn.end.y;
    const tag = el(g, "g", {});
    const frame = el(tag, "rect", { x: bn.end.x - w / 2, y: ly, width: w, height: LABEL_H - 8, style: `rx: ${radius(8)}; stroke-width: ${strokeW(3)}` });
    Object.assign(frame.style, { fill: "var(--k-bg)", stroke: "var(--k-line)" });
    text(tag, bn.label, { x: bn.end.x, y: ly + (LABEL_H - 8) / 2 + typeSize("label", FONT) * 0.35, "text-anchor": "middle", "font-weight": 700 });
    // The accent look over the plain one, shown while the bone is lit.
    const hot = el(g, "g", {});
    const hl = el(hot, "line", { x1: bn.base.x, y1: bn.base.y, x2: bn.end.x, y2: bn.end.y, style: `stroke-width: ${strokeW(6)}`, "stroke-linecap": "round" });
    hl.style.stroke = "var(--k-accent)";
    const hf = el(hot, "rect", { x: bn.end.x - w / 2, y: ly, width: w, height: LABEL_H - 8, style: `rx: ${radius(8)}; stroke-width: ${strokeW(4)}`, fill: "none" });
    hf.style.stroke = "var(--k-accent)";
    const items = bn.items.map((it) => {
      const tick = el(g, "line", { x1: it.at.x - TICK, y1: it.at.y, x2: it.at.x, y2: it.at.y, style: `stroke-width: ${strokeW(3)}` });
      tick.style.stroke = "var(--k-muted)";
      const t = text(g, it.text, { x: it.at.x - TICK - 8, y: it.at.y + typeSize("label", FONT) * 0.35, "text-anchor": "end" });
      return [tick, t];
    });
    gsap.set([tag, hot, ...items.flat()], { autoAlpha: 0 });
    return { line, tag, hot, items };
  });

  let built = 0; // bones the next() steps added so far built
  let lit: number | null = null; // the bone lit after the steps added so far
  return {
    show(tl) {
      const t = tl.duration();
      tl.to([head, say], { autoAlpha: 1, duration: motion.step }, t);
      tl.to(spine, { strokeDashoffset: 0, duration: motion.step, ease: "power2.out", autoRound: false }, t);
    },
    // The bone is picked when the step is added, not here: adders made out of step order still build in order.
    next: () => (tl) => {
      const bn = bones[built++];
      if (!bn) {
        ctx.problem(`fishbone: next() past the last cause (${bones.length} causes)`);
        return void tl.set({}, {}, tl.duration() + 0.4); // the step still takes a beat
      }
      const t = tl.duration();
      const d = { immediateRender: false, autoRound: false };
      tl.fromTo(bn.line, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: motion.step, ease: "power2.out", ...d }, t);
      tl.fromTo(bn.tag, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step / 2, ...d }, t + motion.step * 0.6);
      bn.items.forEach((it, j) => tl.fromTo(it, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step / 2, ...d }, t + motion.step + j * 0.15));
    },
    light: (i) => (tl) => {
      if (i !== null && !(i >= 0 && i < built)) return ctx.problem(`fishbone: light(${i}) before cause ${i} is built (${built} built)`);
      if (i === lit) return;
      const t = tl.duration();
      const d = { duration: motion.step, immediateRender: false };
      if (lit !== null) tl.fromTo(bones[lit].hot, { autoAlpha: 1 }, { autoAlpha: 0, ...d }, t);
      if (i !== null) tl.fromTo(bones[i].hot, { autoAlpha: 0 }, { autoAlpha: 1, ...d }, t);
      lit = i;
    },
  };
}
