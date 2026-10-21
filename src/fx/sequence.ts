import { gsap } from "gsap";
import { drawOn } from "./draw";
import type { Ctx, Rect, StepAdder } from "../types";

export type SequenceOpts = {
  actors: { id: string; label: string }[];
  messages: { from: string; to: string; text: string; reply?: boolean }[];
} & Rect;
export interface SequenceHandle {
  actors: StepAdder;
  message(i: number): StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const HEAD_H = 64; // actor head height
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 24;
const LINE_H = 1.2;
const ARROW = 20; // arrowhead length
const LOOP = 70; // how far a self-message loop reaches out
const PAD = 28; // gap under the heads: the first label sits clear of them
const MIN_PITCH = 36; // least row spacing that holds a label above its arrow
const DRAW = 0.5; // seconds an arrow takes to draw on
let masks = 0;

const hide = (...els: Element[]) => gsap.set(els, { autoAlpha: 0 });
const r2 = (n: number) => Math.round(n * 100) / 100;

// The y of message i's arrow among n rows below the actor heads, evenly spaced and inside rect.
export function rowY(i: number, n: number, rect: Rect): number {
  const top = rect.y + HEAD_H + PAD;
  return top + ((i + 0.5) * (rect.y + rect.h - top)) / Math.max(n, 1);
}

// Actors in even columns with dashed lifelines; each message is an arrow between lifelines at its own row.
export function sequence(ctx: Ctx, opts: SequenceOpts): SequenceHandle {
  const { actors, messages } = opts;
  const colW = opts.w / Math.max(actors.length, 1);
  const cx = new Map(actors.map((a, k) => [a.id, opts.x + (k + 0.5) * colW]));
  const at = (id: string) => {
    const x = cx.get(id);
    if (x === undefined) throw new Error(`sequence: unknown actor "${id}"`);
    return x;
  };
  for (const m of messages) [m.from, m.to].forEach(at);
  const pitch = (opts.h - HEAD_H - PAD) / Math.max(messages.length, 1);
  if (pitch < MIN_PITCH) ctx.problem(`sequence: ${messages.length} messages do not fit the height`);

  const bottom = opts.y + opts.h;
  const headW = Math.min(colW * 0.8, 260);
  const heads: HTMLElement[] = [];
  const lifelines: SVGElement[] = [];
  actors.forEach((a, k) => {
    const x = cx.get(a.id)!;
    // Text stays --k-fg on the surface; the series colour is the border, so contrast never depends on it.
    const el = document.createElement("div");
    el.setAttribute("data-k-seq-actor", a.id);
    Object.assign(el.style, {
      position: "absolute", left: `${x - headW / 2}px`, top: `${opts.y}px`, width: `${headW}px`, height: `${HEAD_H}px`, boxSizing: "border-box",
      border: `4px solid var(--k-series-${(k % 6) + 1})`, borderRadius: "12px", background: "var(--k-surface)", color: "var(--k-fg)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "0 10px", textAlign: "center",
      font: `600 ${MAX_FONT}px/${LINE_H} var(--k-font)`, whiteSpace: "nowrap", overflow: "hidden", zIndex: "2",
    });
    el.textContent = a.label;
    ctx.html.append(el);
    const line = document.createElementNS(SVG, "path");
    line.setAttribute("d", `M ${r2(x)} ${opts.y + HEAD_H} L ${r2(x)} ${bottom}`);
    Object.assign(line.style, { fill: "none", stroke: "var(--k-line)", strokeWidth: "2", strokeDasharray: "6 10", strokeOpacity: "0.5" });
    ctx.svg.append(line);
    hide(el, line);
    heads.push(el);
    lifelines.push(line);
  });

  const rows = messages.map((m, i) => {
    const y = rowY(i, messages.length, opts);
    const [x0, x1] = [at(m.from), at(m.to)];
    const self = x0 === x1;
    const drop = Math.min(30, pitch * 0.45);
    // Points of the line, ending where the arrowhead starts; the head is its own triangle that appears on arrival.
    let pts: [number, number][], tip: [number, number], dir: [number, number];
    if (self) {
      pts = [[x0, y], [x0 + LOOP, y], [x0 + LOOP, y + drop], [x0 + ARROW, y + drop]];
      tip = [x0, y + drop];
      dir = [-1, 0];
    } else {
      const s = x1 > x0 ? 1 : -1;
      pts = [[x0, y], [x1 - s * ARROW, y]];
      tip = [x1, y];
      dir = [s, 0];
    }
    const d = pts.map((p, k) => `${k ? "L" : "M"} ${r2(p[0])} ${r2(p[1])}`).join(" ");
    const line = document.createElementNS(SVG, "path");
    line.setAttribute("d", d);
    Object.assign(line.style, { fill: "none", stroke: "var(--k-line)", strokeWidth: "4", strokeLinejoin: "round" });
    ctx.svg.append(line);
    // A dashed line cannot use drawOn (it owns the dash): a solid copy draws on inside an alpha mask instead.
    let drawn: SVGElement = line;
    if (m.reply) {
      line.style.strokeDasharray = "12 10";
      const id = `k-seq-mask-${masks++}`;
      const mask = document.createElementNS(SVG, "mask");
      mask.setAttribute("id", id);
      for (const [k, v] of Object.entries({ maskUnits: "userSpaceOnUse", x: opts.x - 100, y: opts.y - 100, width: opts.w + 200, height: opts.h + 200 })) mask.setAttribute(k, String(v));
      mask.style.maskType = "alpha";
      const solid = document.createElementNS(SVG, "path");
      solid.setAttribute("d", d);
      Object.assign(solid.style, { fill: "none", stroke: "var(--k-fg)", strokeWidth: "8", strokeLinejoin: "round" });
      mask.append(solid);
      ctx.svg.append(mask);
      line.setAttribute("mask", `url(#${id})`);
      drawn = solid;
    }
    const [p, q] = [tip, dir];
    const head = document.createElementNS(SVG, "path");
    const base: [number, number] = [p[0] - q[0] * ARROW, p[1] - q[1] * ARROW];
    head.setAttribute("d", `M ${r2(p[0])} ${r2(p[1])} L ${r2(base[0] - q[1] * 11)} ${r2(base[1] + q[0] * 11)} L ${r2(base[0] + q[1] * 11)} ${r2(base[1] - q[0] * 11)} Z`);
    head.style.fill = "var(--k-line)";
    ctx.svg.append(head);

    const tag = document.createElement("div");
    tag.textContent = m.text;
    // Above a normal arrow, centred between the lifelines; right of a loop, centred on it.
    Object.assign(tag.style, {
      position: "absolute", padding: "2px 10px", borderRadius: "8px", background: "var(--k-bg)", color: "var(--k-fg)",
      font: `600 ${MAX_FONT}px/${LINE_H} var(--k-font)`, whiteSpace: "nowrap", zIndex: "3",
      ...(self
        ? { left: `${x0 + LOOP + 10}px`, top: `${y + drop / 2}px`, translate: "0 -50%" }
        : { left: `${(x0 + x1) / 2}px`, top: `${y - 6}px`, translate: "-50% -100%" }),
    });
    ctx.html.append(tag);
    hide(tag, line, head);
    const room = self ? opts.x + opts.w - (x0 + LOOP + 10) : Math.abs(x1 - x0) - 2 * ARROW;
    return { line, drawn, head, tag, room, reply: !!m.reply };
  });

  // Fitted on first use, once the layout exists: heads and labels shrink to the floor, then report.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    heads.forEach((el, k) => {
      let size = MAX_FONT;
      for (; size > FLOOR && el.scrollWidth > el.clientWidth; size -= 2) el.style.fontSize = `${size - 2}px`;
      if (el.scrollWidth > el.clientWidth) ctx.problem(`sequence: label of actor "${actors[k].id}" too long`);
    });
    rows.forEach((r, i) => {
      let size = MAX_FONT;
      for (; size > FLOOR && r.tag.offsetWidth > r.room; size -= 2) r.tag.style.fontSize = `${size - 2}px`;
      if (r.tag.offsetWidth > r.room) ctx.problem(`sequence: label of message ${i} too long`);
    });
  };

  type Row = (typeof rows)[number];
  const paint = (tl: gsap.core.Timeline, r: Row, on: boolean, t: number) => {
    const c = on ? "var(--k-accent)" : "var(--k-line)";
    tl.set(r.line, { stroke: c, immediateRender: false }, t);
    tl.set(r.head, { fill: c, immediateRender: false }, t);
    tl.set(r.tag, { color: on ? "var(--k-accent)" : "var(--k-fg)", immediateRender: false }, t);
  };
  let current: Row | undefined;

  return {
    actors(tl) {
      fit();
      const t = tl.duration();
      tl.to(heads, { autoAlpha: 1, duration: 0.4 }, t);
      tl.to(lifelines, { autoAlpha: 1, duration: 0.4 }, t + 0.2);
    },
    message(i) {
      const r = rows[i];
      if (!r) throw new Error(`sequence: no message ${i}`);
      return (tl) => {
        fit();
        const t = tl.duration();
        // The message being drawn is accent; the one before settles as this one starts (a set, so it seeks).
        if (current && current !== r) paint(tl, current, false, t);
        paint(tl, r, true, t);
        current = r;
        tl.set(r.line, { autoAlpha: 1 }, t);
        drawOn(r.drawn, { duration: DRAW, each: 0, at: t })(tl);
        tl.to(r.head, { autoAlpha: 1, duration: 0.12 }, t + DRAW);
        tl.to(r.tag, { autoAlpha: 1, duration: 0.25 }, t + DRAW);
      };
    },
  };
}
