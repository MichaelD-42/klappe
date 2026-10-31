import { gsap } from "gsap";
import { drawOn, typeSize } from "./draw";
import { arrow } from "./shape";
import type { Ctx, Rect, StepAdder } from "../types";

type P = { x: number; y: number };
export interface CycleOpts {
  x: number; // the centre of the ring, scene-local
  y: number;
  r: number; // the radius the phase boxes sit on
  phases: string[]; // clockwise from the top
}
export interface CycleHandle {
  show: StepAdder;
  phase(i: number): StepAdder;
}
export type VModelOpts = { levels: { left: string; right: string }[] } & Rect; // levels from the top
export interface VModelHandle {
  show: StepAdder;
  level(i: number): StepAdder;
  link(i: number): StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 26;
const LINE_H = 1.2;
const BOX_H = 80;
const CYCLE_W = 240;
const GAP = 16; // clear space between a box and an arc end
const HEAD = 20; // each head stroke's length
const V_W = 320;
const V_GAP = 80; // the narrowest link, at the bottom level
const TURN = 90; // below the bottom level, for the arrow that turns the V
const LEG_GAP = 10; // clear space between a box border and a leg arrow end
const r2 = (n: number) => Math.round(n * 100) / 100;

// The phase box centres, clockwise from the top, and the arc (with its head) from each box to the next.
// Each arc starts and ends GAP outside the boxes. Boxes that touch their neighbours give a problem and no arcs.
export function cycleLayout(c: P & { r: number }, n: number, box = { w: CYCLE_W, h: BOX_H }): { nodes: P[]; arcs: { d: string; head: string }[]; problem?: string } {
  const at = (a: number) => ({ x: c.x + c.r * Math.cos(a), y: c.y + c.r * Math.sin(a) });
  const ang = Array.from({ length: n }, (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / n);
  const nodes = ang.map((a) => { const p = at(a); return { x: r2(p.x), y: r2(p.y) }; });
  if (n < 2) return { nodes, arcs: [] };
  const step = (2 * Math.PI) / n;
  const inside = (p: P, k: number) => Math.abs(p.x - nodes[k].x) < box.w / 2 + GAP && Math.abs(p.y - nodes[k].y) < box.h / 2 + GAP;
  // The angle the ring needs from a box centre (dir +1 clockwise, -1 back) to clear the box and its gap.
  const clear = (k: number, dir: number) => {
    let d = 0;
    while (d < step && inside(at(ang[k] + dir * d), k)) d += 0.002;
    return d;
  };
  const f = (p: P) => `${r2(p.x)} ${r2(p.y)}`;
  const arcs = [];
  for (let k = 0; k < n; k++) {
    const [a0, a1] = [ang[k] + clear(k, 1), ang[k] + step - clear((k + 1) % n, -1)];
    if (a1 - a0 < 0.05) return { nodes, arcs: [], problem: `cycle: ${n} phases do not fit a ring of radius ${c.r}` };
    const [p0, p1] = [at(a0), at(a1)];
    // The tip travels clockwise, along (-sin, cos): the head strokes point back from it.
    const back = Math.atan2(-Math.cos(a1), Math.sin(a1));
    const [h1, h2] = [-0.45, 0.45].map((s) => ({ x: p1.x + HEAD * Math.cos(back + s), y: p1.y + HEAD * Math.sin(back + s) }));
    arcs.push({ d: `M${f(p0)} A${c.r} ${c.r} 0 0 1 ${f(p1)}`, head: `M${f(h1)} L${f(p1)} L${f(h2)}` });
  }
  return { nodes, arcs };
}

// Per level from the top, the left box (stepping in to the right), its mirrored right box, and the link
// between their inner sides. The rect's bottom TURN px hold the arrow that turns the V.
export function vModelLayout(rect: Rect, n: number): { left: Rect[]; right: Rect[]; links: { x1: number; x2: number; y: number }[]; problem?: string } {
  const bw = Math.min(V_W, (rect.w - V_GAP) / 2);
  const row = n ? (rect.h - TURN) / n : 0;
  const bh = Math.min(BOX_H, row - 40);
  const dx = n > 1 ? (rect.w / 2 - bw - V_GAP / 2) / (n - 1) : 0;
  const left = Array.from({ length: n }, (_, i) => ({ x: r2(rect.x + i * dx), y: r2(rect.y + i * row), w: r2(bw), h: r2(bh) }));
  const right = left.map((b) => ({ ...b, x: r2(2 * rect.x + rect.w - b.x - bw) }));
  const links = left.map((b, i) => ({ x1: r2(b.x + b.w), x2: right[i].x, y: r2(b.y + b.h / 2) }));
  const problem = bh < 56 ? `vModel: ${n} levels do not fit ${rect.h}px` : undefined;
  return { left, right, links, ...(problem ? { problem } : {}) };
}

// A label box like a matrix chip: a 2 px --k-line border, and a 2 px outline that is transparent until lit.
function box(ctx: Ctx, label: string, r: Rect, attr: string) {
  const el = document.createElement("div");
  el.setAttribute(attr, "");
  Object.assign(el.style, {
    position: "absolute", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, boxSizing: "border-box",
    padding: "4px 12px", border: "2px solid var(--k-line)", borderRadius: "12px", outline: "2px solid transparent",
    background: "var(--k-surface)", color: "var(--k-fg)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
    font: `600 ${typeSize("label", MAX_FONT)}px/${LINE_H} var(--k-font)`, zIndex: "2",
  });
  const text = el.appendChild(document.createElement("div"));
  text.textContent = label;
  Object.assign(text.style, { overflowWrap: "anywhere", maxWidth: "100%" });
  ctx.html.append(el);
  gsap.set(el, { autoAlpha: 0 });
  return { el, text, label };
}
type Box = ReturnType<typeof box>;

// Labels wrap to two lines and shrink to the floor; fitted on first use, when the layout exists.
function fitter(ctx: Ctx, boxes: Box[], who: string) {
  let fitted = false;
  return () => {
    if (fitted) return;
    fitted = true;
    for (const { el, text, label } of boxes) {
      let size = typeSize("label", MAX_FONT);
      const over = () => text.offsetHeight > LINE_H * size * 2 + 1 || text.offsetHeight > el.clientHeight || text.scrollWidth > text.clientWidth;
      for (; size > FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      el.style.fontSize = `${size}px`;
      if (over()) ctx.problem(`${who}: label "${label}" too long`);
    }
  };
}

function path(ctx: Ctx, d: string, style: Partial<CSSStyleDeclaration>) {
  const p = ctx.svg.appendChild(document.createElementNS(SVG, "path"));
  p.setAttribute("d", d);
  Object.assign(p.style, { fill: "none", strokeLinecap: "round", strokeLinejoin: "round", ...style });
  gsap.set(p, { autoAlpha: 0 });
  return p;
}

// Sets at one time, so a lit look seeks like it plays.
const lightBoxes = (tl: gsap.core.Timeline, els: Element[], on: boolean, t: number) =>
  void tl.set(els, on
    ? { borderColor: "var(--k-accent)", outlineColor: "var(--k-accent)", autoAlpha: 1, immediateRender: false }
    : { borderColor: "var(--k-line)", outlineColor: "transparent", immediateRender: false }, t);
const hold = (tl: gsap.core.Timeline, t: number) => void tl.set({}, {}, t + 0.4);

// A loop of phases round a ring (PDCA, a feedback loop), an arrow from each to the next; phase(i) lights one.
export function cycle(ctx: Ctx, opts: CycleOpts): CycleHandle {
  const lay = cycleLayout(opts, opts.phases.length);
  if (lay.problem) ctx.problem(lay.problem);
  const boxes = opts.phases.map((label, i) => {
    const b = box(ctx, label, { x: lay.nodes[i].x - CYCLE_W / 2, y: lay.nodes[i].y - BOX_H / 2, w: CYCLE_W, h: BOX_H }, "data-k-cycle-phase");
    b.el.setAttribute("data-k-cycle-phase", String(i));
    return b;
  });
  const stroke = { stroke: "var(--k-line)", strokeWidth: "4" };
  const arcs = lay.arcs.map((a) => ({ d: path(ctx, a.d, stroke), head: path(ctx, a.head, stroke) }));
  const fit = fitter(ctx, boxes, "cycle");
  let lit: number | undefined; // the phase lit by the latest phase() step, set when the step is added

  return {
    show(tl) {
      fit();
      const t = tl.duration();
      // Round the ring: each box fades in, then the arc to the next one draws on.
      boxes.forEach((b, i) => {
        const s = t + i * 0.5;
        tl.to(b.el, { autoAlpha: 1, duration: 0.3 }, s);
        const a = arcs[i];
        if (!a) return;
        tl.set(a.d, { autoAlpha: 1 }, s + 0.2).set(a.head, { autoAlpha: 1 }, s + 0.55);
        drawOn(a.d, { duration: 0.4, at: s + 0.2 })(tl);
        drawOn(a.head, { duration: 0.15, at: s + 0.55 })(tl);
      });
    },
    phase(i) {
      if (!boxes[i]) throw new Error(`cycle: no phase ${i}`);
      return (tl) => {
        fit();
        const t = tl.duration();
        if (lit !== undefined && lit !== i) lightBoxes(tl, [boxes[lit].el], false, t);
        lightBoxes(tl, [boxes[i].el], true, t);
        lit = i;
        hold(tl, t);
      };
    },
  };
}

// The V model: the left leg steps down (requirements to design), the right leg climbs (integration to
// validation), and a dashed link joins each level to the test that checks it. level(i) and link(i) light one.
export function vModel(ctx: Ctx, opts: VModelOpts): VModelHandle {
  const n = opts.levels.length;
  const lay = vModelLayout(opts, n);
  if (lay.problem) ctx.problem(lay.problem);
  const pairs = opts.levels.map((lv, i) => {
    const [l, r] = [box(ctx, lv.left, lay.left[i], "data-k-v-level"), box(ctx, lv.right, lay.right[i], "data-k-v-level")];
    l.el.setAttribute("data-k-v-level", `${i}-left`);
    r.el.setAttribute("data-k-v-level", `${i}-right`);
    return [l, r];
  });
  const links = lay.links.map((k, i) => {
    const d = `M${k.x1} ${k.y} L${k.x2} ${k.y}`;
    const base = path(ctx, d, { stroke: "var(--k-line)", strokeWidth: "3", strokeDasharray: "10 12", strokeLinecap: "butt" });
    const on = path(ctx, d, { stroke: "var(--k-accent)", strokeWidth: "6" });
    on.setAttribute("data-k-v-link", String(i));
    return { base, on };
  });
  const mid = (b: Rect, side: "top" | "bottom") => ({ x: b.x + b.w / 2, y: side === "top" ? b.y - LEG_GAP : b.y + b.h + LEG_GAP });
  const legs = [
    ...lay.left.slice(1).map((b, i) => arrow(ctx, { from: mid(lay.left[i], "bottom"), to: mid(b, "top") })),
    ...(n ? [arrow(ctx, { from: mid(lay.left[n - 1], "bottom"), to: mid(lay.right[n - 1], "bottom"), curve: -0.3 })] : []),
    ...lay.right.slice(1).map((b, i) => arrow(ctx, { from: mid(b, "top"), to: mid(lay.right[i], "bottom") })).reverse(),
  ];
  const fit = fitter(ctx, pairs.flat(), "vModel");
  // The level or link lit by the latest level() or link() step, set when the step is added; it settles when the next
  // starts. A link right after its own level keeps that pair lit, and the pair settles with the link.
  let lit: { kind: "level" | "link"; i: number } | undefined;
  const light = (kind: "level" | "link", i: number): StepAdder => {
    if (i < 0 || i >= n || !Number.isInteger(i)) throw new Error(`vModel: no ${kind} ${i}`);
    return (tl) => {
      fit();
      const t = tl.duration();
      const keepPair = kind === "link" && lit?.kind === "level" && lit.i === i;
      if (lit && !keepPair) lightBoxes(tl, pairs[lit.i].map((b) => b.el), false, t); // after a link: off, or already off
      if (lit?.kind === "link") tl.set(links[lit.i].on, { autoAlpha: 0, immediateRender: false }, t);
      lit = { kind, i };
      if (kind === "level") return void (lightBoxes(tl, pairs[i].map((b) => b.el), true, t), hold(tl, t));
      tl.set([links[i].base, links[i].on], { autoAlpha: 1, immediateRender: false }, t);
      drawOn(links[i].on, { duration: 0.6, at: t })(tl);
    };
  };

  return {
    show(tl) {
      fit();
      const t = tl.duration();
      // Down the left leg, round the turn, up the right leg; each leg arrow draws on as its box arrives. Then the links.
      const order = [...pairs.map((p) => p[0]), ...pairs.map((p) => p[1]).reverse()];
      order.forEach((b, k) => tl.to(b.el, { autoAlpha: 1, duration: 0.3 }, t + k * 0.35));
      legs.forEach((a, k) => {
        const s = t + k * 0.35 + 0.15;
        const [shaft, head] = [...a.el.children];
        tl.set(a.el, { autoAlpha: 1 }, s).set(head, { autoAlpha: 1 }, s + 0.25);
        drawOn(shaft, { duration: 0.25, at: s })(tl);
        drawOn(head, { duration: 0.1, at: s + 0.25 })(tl);
      });
      const end = t + order.length * 0.35;
      links.forEach((k) => tl.set(k.base, { autoAlpha: 1 }, end));
      drawOn(links.map((k) => k.base), { duration: 0.5, each: 0.1, at: end })(tl);
    },
    level: (i) => light("level", i),
    link: (i) => light("link", i),
  };
}
