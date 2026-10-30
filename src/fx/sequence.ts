import { gsap } from "gsap";
import { drawOn, typeSize } from "./draw";
import type { Ctx, Rect, StepAdder } from "../types";

type Message = { from: string; to: string; text: string; reply?: boolean };
type Note = { note: string; over: string | [string, string] }; // a row with a note over one actor or across two
export type SequenceOpts = {
  actors: { id: string; label: string }[];
  messages: (Message | Note)[]; // the rows, top to bottom
  activations?: { actor: string; from: number; to: number }[]; // a bar on the actor's lifeline over rows from..to
  frames?: { kind: "alt" | "loop" | "opt" | "par"; label: string; from: number; to: number; else?: { at: number; label: string } }[];
} & Rect;
export interface SequenceHandle {
  actors: StepAdder;
  message(i: number): StepAdder;
  highlight(i: number | null): StepAdder; // a shown message takes the accent again; null: none
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
const BAR = 16; // an activation bar's width
const NOTE_W = 220; // a note over one actor; across two it reaches this far past each
const SMALL = 20; // a frame's kind and guard
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
  const isNote = (m: Message | Note): m is Note => "note" in m;
  for (const m of messages) (isNote(m) ? [m.over].flat() : [m.from, m.to]).forEach(at);
  const row = (i: number, what: string) => {
    if (!(i >= 0 && i < messages.length)) throw new Error(`sequence: ${what} names row ${i}, which is not there`);
    return i;
  };
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
      font: `600 ${typeSize("label", MAX_FONT)}px/${LINE_H} var(--k-font)`, whiteSpace: "nowrap", overflow: "hidden", zIndex: "2",
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

  // Bars go in before the arrows, so the arrows paint over them; each shows with its first row.
  const ys = messages.map((_, i) => rowY(i, messages.length, opts));
  const shownWith = messages.map((): Element[] => []);
  for (const a of opts.activations ?? []) {
    const x = at(a.actor);
    const [y0, y1] = [ys[row(a.from, "an activation")] - pitch * 0.3, ys[row(a.to, "an activation")] + pitch * 0.3];
    const bar = document.createElementNS(SVG, "rect");
    for (const [k, v] of Object.entries({ x: r2(x - BAR / 2), y: r2(y0), width: BAR, height: r2(y1 - y0) })) bar.setAttribute(k, String(v));
    bar.setAttribute("data-k-seq-activation", a.actor);
    Object.assign(bar.style, { fill: "var(--k-surface)", stroke: "var(--k-line)", strokeWidth: "2" });
    ctx.svg.append(bar);
    hide(bar);
    shownWith[a.from].push(bar);
  }
  // A frame runs across the diagram round its rows: its kind and guard in the top-left corner, an else line
  // across it above its row.
  const frames = opts.frames ?? [];
  for (const f of frames) {
    // A frame inside another sits 12 px further in on each side and from the outer one's top and bottom.
    const depth = frames.filter((o) => o !== f && o.from <= f.from && o.to >= f.to).length;
    const inset = depth * 12;
    const [y0, y1] = [ys[row(f.from, "a frame")] - pitch / 2 + 2 + inset, ys[row(f.to, "a frame")] + pitch / 2 - 2 - inset];
    const el = document.createElement("div");
    el.setAttribute("data-k-seq-frame", f.kind);
    Object.assign(el.style, {
      position: "absolute", left: `${opts.x + inset}px`, top: `${r2(y0)}px`, width: `${opts.w - 2 * inset}px`, height: `${r2(y1 - y0)}px`, boxSizing: "border-box",
      border: "2px solid var(--k-line)", borderRadius: "6px", zIndex: "1", pointerEvents: "none",
    });
    const tag = el.appendChild(document.createElement("div"));
    Object.assign(tag.style, { display: "inline-flex", gap: "8px", padding: "2px 10px", background: "var(--k-surface)", color: "var(--k-fg)", font: `600 ${typeSize("label", SMALL)}px/${LINE_H} var(--k-font)`, borderBottomRightRadius: "6px" });
    tag.append(Object.assign(document.createElement("b"), { textContent: f.kind }), Object.assign(document.createElement("span"), { textContent: ` [${f.label}]` }));
    ctx.html.append(el);
    hide(el);
    shownWith[f.from].push(el);
    if (f.else) {
      const line = document.createElement("div");
      line.setAttribute("data-k-seq-else", "");
      line.textContent = `[${f.else.label}]`;
      Object.assign(line.style, {
        position: "absolute", left: `${opts.x}px`, top: `${r2(ys[row(f.else.at, "an else")] - pitch / 2)}px`, width: `${opts.w}px`, boxSizing: "border-box",
        borderTop: "2px dashed var(--k-line)", padding: "2px 10px", color: "var(--k-fg)", font: `600 ${typeSize("label", SMALL)}px/${LINE_H} var(--k-font)`, zIndex: "1",
      });
      ctx.html.append(line);
      hide(line);
      shownWith[f.else.at].push(line);
    }
  }

  const rows = messages.map((m, i) => {
    const y = ys[i];
    if (isNote(m)) {
      // A note row: a box over its actor, or across two from the left one to the right one.
      const xs = [m.over].flat().map(at);
      const [l, r] = [Math.min(...xs) - NOTE_W / 2, Math.max(...xs) + NOTE_W / 2];
      const h = Math.min(pitch - 8, HEAD_H);
      const tag = document.createElement("div");
      tag.setAttribute("data-k-seq-note", "");
      const text = tag.appendChild(document.createElement("span"));
      text.textContent = m.note;
      Object.assign(tag.style, {
        position: "absolute", left: `${r2(l)}px`, top: `${r2(y - h / 2)}px`, width: `${r2(r - l)}px`, height: `${r2(h)}px`, boxSizing: "border-box",
        border: "2px solid var(--k-line)", borderRadius: "4px", background: "var(--k-surface)", color: "var(--k-fg)", padding: "0 10px",
        display: "flex", alignItems: "center", justifyContent: "center", whiteSpace: "nowrap", font: `600 ${typeSize("label", MAX_FONT)}px/${LINE_H} var(--k-font)`, zIndex: "3",
      });
      ctx.html.append(tag);
      hide(tag);
      return { note: text, room: r - l - 24, tag, extra: shownWith[i] };
    }
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
      font: `600 ${typeSize("label", MAX_FONT)}px/${LINE_H} var(--k-font)`, whiteSpace: "nowrap", zIndex: "3",
      ...(self
        ? { left: `${x0 + LOOP + 10}px`, top: `${y + drop / 2}px`, translate: "0 -50%" }
        : { left: `${(x0 + x1) / 2}px`, top: `${y - 6}px`, translate: "-50% -100%" }),
    });
    ctx.html.append(tag);
    hide(tag, line, head);
    const room = self ? opts.x + opts.w - (x0 + LOOP + 10) : Math.abs(x1 - x0) - 2 * ARROW;
    return { line, drawn, head, tag, room, reply: !!m.reply, extra: shownWith[i] };
  });

  // Fitted on first use, once the layout exists: heads and labels shrink to the floor, then report.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    heads.forEach((el, k) => {
      let size = typeSize("label", MAX_FONT);
      for (; size > FLOOR && el.scrollWidth > el.clientWidth; size -= 2) el.style.fontSize = `${size - 2}px`;
      if (el.scrollWidth > el.clientWidth) ctx.problem(`sequence: label of actor "${actors[k].id}" too long`);
    });
    rows.forEach((r, i) => {
      // A note box has a fixed width: its text is what must fit.
      const w = () => (r.note ?? r.tag).offsetWidth;
      let size = typeSize("label", MAX_FONT);
      for (; size > FLOOR && w() > r.room; size -= 2) r.tag.style.fontSize = `${size - 2}px`;
      if (w() > r.room) ctx.problem(`sequence: label of message ${i} too long`);
    });
  };

  type Row = (typeof rows)[number];
  const paint = (tl: gsap.core.Timeline, r: Row, on: boolean, t: number) => {
    if (r.note) return;
    const c = on ? "var(--k-accent)" : "var(--k-line)";
    tl.set(r.line, { stroke: c, immediateRender: false }, t);
    tl.set(r.head, { fill: c, immediateRender: false }, t);
    tl.set(r.tag, { color: on ? "var(--k-accent)" : "var(--k-fg)", immediateRender: false }, t);
  };
  let current: Row | undefined;
  const shown = new Set<Row>(); // the rows the message steps added so far show

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
        if (r.extra.length) tl.to(r.extra, { autoAlpha: 1, duration: 0.3 }, t);
        if (r.note) return void tl.to(r.tag, { autoAlpha: 1, duration: 0.4 }, t);
        // The message being drawn is accent; the one before settles as this one starts (a set, so it seeks).
        if (current && current !== r) paint(tl, current, false, t);
        paint(tl, r, true, t);
        current = r;
        shown.add(r);
        tl.set(r.line, { autoAlpha: 1 }, t);
        drawOn(r.drawn, { duration: DRAW, each: 0, at: t })(tl);
        tl.to(r.head, { autoAlpha: 1, duration: 0.12 }, t + DRAW);
        tl.to(r.tag, { autoAlpha: 1, duration: 0.25 }, t + DRAW);
      };
    },
    highlight: (i) => (tl) => {
      const r = i === null ? undefined : rows[i];
      const t = tl.duration();
      tl.set({}, {}, t + 0.4); // a set only: the step still takes a beat
      if (i !== null && (!r || r.note || !shown.has(r)))
        return ctx.problem(`sequence: highlight(${i}) needs a message a step before has shown`);
      if (current && current !== r) paint(tl, current, false, t);
      if (r) paint(tl, r, true, t);
      current = r;
    },
  };
}
