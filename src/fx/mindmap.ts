import { gsap } from "gsap";
import * as d3 from "d3";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { typeSize } from "./draw";
import { radius, strokeW } from "./layout";

export interface MindNode {
  label: string;
  children?: MindNode[];
}
export type MindMapOpts = { root: MindNode } & Rect;
export interface MindMapHandle {
  show: StepAdder; // the centre topic
  next(): StepAdder; // the next branch grows out, with its sub-branches
  light(i: number | null): StepAdder; // grown branch i stays at full strength, the others dim; null: all back
}

const SVG = "http://www.w3.org/2000/svg";
const FONT = 26; // fixed in scene units: 18.5 px at 1366
const CHAR_W = 14; // about one character at FONT
const charW = () => (CHAR_W * typeSize("label", FONT)) / FONT; // follows the type scale
const DIM = 0.35; // the branches light() leaves out
const MAIN_R = 0.5; // a branch's distance from the centre, as a share of the leaves' ellipse

export interface MindSpot { label: string; x: number; y: number; anchor: "start" | "middle" | "end"; branch: number; parent?: number }
export interface MindMapLayout { centre: { x: number; y: number }; branches: MindSpot[]; leaves: MindSpot[]; problem?: string }

// Branches round the centre, their sub-branches further out; every outermost node gets an even share of the turn
// (d3.cluster), from 12 o'clock clockwise, so sub-branches of neighbouring branches never cross. The leaves sit on an
// ellipse inset from the rect by the longest leaf label, so every label beside its point, towards the outside, stays in. Two leaves whose labels would touch
// give a problem.
export function mindMapLayout(root: MindNode, rect: Rect): MindMapLayout {
  const h = d3.hierarchy(root, (n) => n.children);
  d3.cluster<MindNode>().size([2 * Math.PI, 1]).separation(() => 1)(h);
  const longest = Math.max(0, ...h.leaves().filter((n) => n.depth > 1).map((n) => n.data.label.length));
  const [cx, cy] = [rect.x + rect.w / 2, rect.y + rect.h / 2];
  const [rx, ry] = [Math.max(rect.w / 4, rect.w / 2 - longest * charW() - 28), rect.h / 2 - typeSize("label", FONT) * 1.6];
  const at = (a: number, r: number) => ({ x: Math.round((cx + rx * r * Math.sin(a)) * 100) / 100, y: Math.round((cy - ry * r * Math.cos(a)) * 100) / 100 });
  const anchor = (a: number): MindSpot["anchor"] => (Math.sin(a) > 0.2 ? "start" : Math.sin(a) < -0.2 ? "end" : "middle");
  const mains = (h.children ?? []) as d3.HierarchyPointNode<MindNode>[];
  const branches = mains.map((n, i) => ({ label: n.data.label, ...at(n.x, MAIN_R), anchor: "middle" as const, branch: i }));
  const leaves = mains.flatMap((n, i) =>
    ((n.children ?? []) as d3.HierarchyPointNode<MindNode>[]).map((c) => ({ label: c.data.label, ...at(c.x, 1), anchor: anchor(c.x), branch: i, parent: i })),
  );
  const box = (s: MindSpot) => {
    const w = s.label.length * charW() + 16;
    const x0 = s.anchor === "start" ? s.x + 12 : s.anchor === "end" ? s.x - 12 - w : s.x - w / 2;
    const y0 = s.anchor === "middle" ? (s.y < cy ? s.y - typeSize("label", FONT) * 1.5 : s.y + typeSize("label", FONT) * 0.3) : s.y - typeSize("label", FONT) * 0.6;
    return { x0, x1: x0 + w, y0, y1: y0 + typeSize("label", FONT) * 1.2 };
  };
  const boxes = leaves.map(box);
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]];
      if (a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1)
        return { centre: { x: cx, y: cy }, branches, leaves, problem: `mindMap: "${leaves[i].label}" and "${leaves[j].label}" overlap; use fewer sub-branches or a larger rect` };
    }
  return { centre: { x: cx, y: cy }, branches, leaves };
}

// A centre topic, then one branch per next(): its line draws out, its label shows, then its sub-branches. Each branch
// in its own series colour. light(i) keeps one branch at full strength and dims the rest, as chart's highlight does.
export function mindMap(ctx: Ctx, opts: MindMapOpts): MindMapHandle {
  const lay = mindMapLayout(opts.root, opts);
  if (lay.problem) ctx.problem(lay.problem);
  const colour = (i: number) => `var(--k-series-${(i % 6) + 1})`;
  const el = <K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) => {
    const e = parent.appendChild(document.createElementNS(SVG, tag));
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };
  const root = el(ctx.svg, "g", { "data-k-mindmap": "" });
  // A curve from a to b that leaves a along the line from the centre.
  const curve = (parent: Element, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const [mx, my] = [(a.x + b.x) / 2, (a.y + b.y) / 2];
    const path = el(parent, "path", { d: `M${a.x} ${a.y}Q${mx} ${a.y + (my - a.y) * 0.2} ${b.x} ${b.y}`, fill: "none", "stroke-linecap": "round", pathLength: 1 });
    gsap.set(path, { strokeDasharray: "1 1", strokeDashoffset: 1, autoRound: false });
    return path;
  };
  const label = (s: { label: string; x: number; y: number }, attrs: Record<string, string | number>, size = typeSize("label", FONT), parent: Element = root) => {
    const t = el(parent, "text", { x: s.x, y: s.y, "font-size": size, ...attrs });
    t.textContent = s.label;
    t.style.fill = "var(--k-fg)";
    return t;
  };

  const c = lay.centre;
  const topW = opts.root.label.length * charW() * 1.3 + 48;
  const centre = el(root, "g", { "data-k-mind-centre": "" });
  const disc = el(centre, "rect", { x: c.x - topW / 2, y: c.y - 40, width: topW, height: 80, style: `rx: ${radius(12)}; stroke-width: ${strokeW(4)}` });
  Object.assign(disc.style, { fill: "var(--k-surface)", stroke: "var(--k-accent)" });
  centre.append(label({ ...c, y: c.y + 12, label: opts.root.label }, { "text-anchor": "middle", "font-weight": 700 }, 34));
  gsap.set(centre, { autoAlpha: 0 });

  const branches = lay.branches.map((b, i) => {
    // The branch in one group, its lines under its boxes, so light() dims it as one picture: a dimmed box
    // never shows its own lines through it.
    const bg = el(root, "g", { "data-k-mind-light": i });
    const lit = [el(bg, "g", {}), el(bg, "g", {})];
    gsap.set(bg, { opacity: 1 }); // inline from load, as a seek back over light() leaves it
    const line = curve(lit[0], c, b);
    Object.assign(line.style, { stroke: colour(i), strokeWidth: strokeW(8) });
    const w = b.label.length * charW() + 32;
    const g = el(lit[1], "g", { "data-k-mind-branch": String(i) });
    const tag = el(g, "rect", { x: b.x - w / 2, y: b.y - 26, width: w, height: 52, style: `rx: ${radius(10)}; stroke-width: ${strokeW(3)}` });
    Object.assign(tag.style, { fill: "var(--k-bg)", stroke: colour(i) });
    g.append(label({ ...b, y: b.y + 9 }, { "text-anchor": "middle", "font-weight": 700 }));
    const kids = lay.leaves.filter((l) => l.parent === i).map((l) => {
      const twig = curve(lit[0], b, l);
      Object.assign(twig.style, { stroke: colour(i), strokeWidth: strokeW(4) });
      const dot = el(lit[1], "circle", { cx: l.x, cy: l.y, r: 6 });
      dot.style.fill = colour(i);
      const dx = l.anchor === "start" ? 12 : l.anchor === "end" ? -12 : 0;
      const dy = l.anchor === "middle" ? (l.y < c.y ? -typeSize("label", FONT) * 0.8 : typeSize("label", FONT) * 1.2) : typeSize("label", FONT) * 0.35;
      const text = label({ ...l, x: l.x + dx, y: l.y + dy }, { "text-anchor": l.anchor }, typeSize("label", FONT), lit[1]);
      gsap.set([dot, text], { autoAlpha: 0 });
      return { twig, shown: [dot, text] };
    });
    gsap.set(g, { autoAlpha: 0 });
    return { line, g, kids, lit: bg };
  });
  root.append(centre); // over the lines that leave it

  let grown = 0; // the branches the next() steps added so far grew
  let lit: number | null = null; // the branch the light() steps added so far leave lit
  return {
    show(tl) {
      tl.to(centre, { autoAlpha: 1, duration: motion.step });
    },
    // The branch is picked when the step is added, not here: adders made out of step order still grow in order.
    next: () => (tl) => {
      const b = branches[grown++];
      if (!b) {
        ctx.problem(`mindMap: next() past the last branch (${branches.length} branches)`);
        return void tl.set({}, {}, tl.duration() + 0.4); // the step still takes a beat
      }
      const t = tl.duration();
      const d = { immediateRender: false, autoRound: false };
      tl.fromTo(b.line, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: motion.step, ease: "power2.out", ...d }, t);
      tl.fromTo(b.g, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step / 2, ...d }, t + motion.step * 0.7);
      b.kids.forEach((k, j) => {
        const at = t + motion.step + j * 0.12;
        tl.fromTo(k.twig, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: motion.step, ease: "power2.out", ...d }, at);
        tl.fromTo(k.shown, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step / 2, ...d }, at + motion.step * 0.6);
      });
    },
    light: (i) => (tl) => {
      if (i !== null && !(i >= 0 && i < grown)) {
        ctx.problem(`mindMap: light(${i}) before branch ${i} has grown (${grown} grown)`);
        return void tl.set({}, {}, tl.duration() + 0.4);
      }
      const level = (k: number, on: number | null) => (on === null || on === k ? 1 : DIM);
      const t = tl.duration();
      const moves = branches.filter((_, k) => level(k, lit) !== level(k, i));
      for (const b of moves) {
        const k = branches.indexOf(b);
        tl.fromTo(b.lit, { opacity: level(k, lit) }, { opacity: level(k, i), duration: motion.step, immediateRender: false }, t);
      }
      if (!moves.length) tl.set({}, {}, t + 0.4); // nothing changes: the step still takes a beat
      lit = i;
    },
  };
}
