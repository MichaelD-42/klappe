import { gsap } from "gsap";
import { motion } from "../theme";
import { rand } from "./swarm";
import type { Ctx, Rect, StepAdder } from "../types";

export type StickyNotesOpts = {
  notes: { id: string; text: string }[];
  groups?: { id: string; label: string }[];
  seed?: number; // picks the scatter; default 1
  compact?: boolean; // a note that leaves a group: the ones after it move up a slot; default: they keep their slots
} & Rect;
export interface StickyNotesHandle {
  show(ids?: string[]): StepAdder;
  group(groupId: string, ids: string[]): StepAdder;
  vote(id: string, n: number): StepAdder; // drops n more dots on the note
}
export type NotePose = { x: number; y: number; rotation: number };

export const NOTE_MIX = 0.3; // the share of the series colour in a note, the rest --k-bg; --k-fg on it holds 5.9:1 or more in every built-in theme
const PAD = 16;
const COL_GAP = 32;
const LABEL_H = 56; // the band at the top of a group column for its label
const NOTE_GAP = 48; // the most room between a label's rule and the first note under it
const MIN_W = 180;
const MAX_W = 240;
const TILT = 4; // the most a scattered note leans, degrees
const FONT = 22;
const FLOOR = 20; // legibility floor, scene px
const LINE_H = 1.2;
const DOT = 22; // a vote dot's diameter
const DOTS = 12; // the most dots a note holds: rows of dots along its top edge, the later rows above it

const r2 = (n: number) => Math.round(n * 100) / 100;

// The smallest scatter cell: a note's box at full lean, plus a margin.
function cellOf(note: { w: number; h: number }) {
  const [c, s] = [Math.cos((TILT * Math.PI) / 180), Math.sin((TILT * Math.PI) / 180)];
  return { w: note.w * c + note.h * s + 8, h: note.h * c + note.w * s + 8 };
}

// Notes (by index) spread evenly over the areas: each area gets a share by its room; in an area, as few rows as
// fit spread over its height, each row's notes over its width, each note in the middle of its cell with a seeded
// nudge and lean. Notes do not overlap while the cells last.
export function scatterIn(areas: Rect[], idx: number[], note: { w: number; h: number }, seed = 1): NotePose[] {
  const cell = cellOf(note);
  const fit = (a: Rect) => [Math.max(1, Math.floor(a.w / cell.w)), Math.max(1, Math.floor(a.h / cell.h))];
  const room = areas.map((a) => fit(a)[0] * fit(a)[1]);
  const per = areas.map((): number[] => []);
  // A seeded order, so the scatter does not read as the note order.
  for (const i of [...idx].sort((a, b) => rand(seed, a, 0) - rand(seed, b, 0))) {
    let best = 0;
    for (let k = 1; k < areas.length; k++) if ((per[k].length + 1) / room[k] < (per[best].length + 1) / room[best]) best = k;
    per[best]?.push(i);
  }
  const out = new Map<number, NotePose>();
  areas.forEach((a, k) => {
    const list = per[k];
    const [cols, maxRows] = fit(a);
    const rows = Math.min(maxRows, Math.ceil(list.length / cols)); // shortcut: more notes than cells overlap; a bigger area is the fix
    for (let r = 0, j = 0; r < rows; r++) {
      const n = Math.ceil((list.length - j) / (rows - r));
      const [cw, ch] = [a.w / n, a.h / rows];
      const [fx, fy] = [Math.max(0, (cw - cell.w) / 2), Math.max(0, (ch - cell.h) / 2)];
      for (let c = 0; c < n; c++, j++) {
        const i = list[j];
        out.set(i, {
          x: r2(a.x + (c + 0.5) * cw - note.w / 2 + fx * (rand(seed, i, 1) * 2 - 1)),
          y: r2(a.y + (r + 0.5) * ch - note.h / 2 + fy * (rand(seed, i, 2) * 2 - 1)),
          rotation: r2((rand(seed, i, 3) * 2 - 1) * TILT),
        });
      }
    }
  });
  return idx.map((i) => out.get(i)!);
}

// The note size, each note's scattered pose over the whole area below the label band, each group's label band,
// each group's column below it (where its notes go, and where scattered notes stay until the group forms), each
// group's note slots, filled row by row under the label, and the slots per row.
export function stickyLayout(rect: Rect, n: number, groups: number, seed = 1): { note: { w: number; h: number }; scatter: NotePose[]; labels: Rect[]; columns: Rect[]; slots: Rect[][]; cols: number } {
  const cw = groups ? (rect.w - (groups - 1) * COL_GAP) / groups : rect.w;
  const cols = groups ? Math.max(1, Math.floor((cw + PAD) / (MIN_W + PAD))) : 1;
  const w = r2(groups ? Math.min(MAX_W, (cw - (cols - 1) * PAD) / cols) : MAX_W);
  const h = r2(w * 0.7);
  const labels = Array.from({ length: groups }, (_, g) => ({ x: r2(rect.x + g * (cw + COL_GAP)), y: rect.y, w: r2(cw), h: LABEL_H }));
  const columns = labels.map((l) => ({ x: l.x, y: rect.y + LABEL_H, w: l.w, h: rect.h - LABEL_H }));
  const rows = Math.max(0, Math.floor((rect.h - LABEL_H) / (h + PAD)));
  const inset = (cw - (cols * w + (cols - 1) * PAD)) / 2;
  const slots = labels.map((l) =>
    Array.from({ length: rows * cols }, (_, k) => ({ x: r2(l.x + inset + (k % cols) * (w + PAD)), y: r2(l.y + LABEL_H + Math.floor(k / cols) * (h + PAD)), w, h })),
  );
  // Scattered notes keep out of the label band, so a label that fades in later is never under one.
  const top = groups ? rect.y + LABEL_H : rect.y;
  const area = { x: rect.x, y: top, w: rect.w, h: rect.y + rect.h - top };
  const scatter = scatterIn([area], Array.from({ length: n }, (_, i) => i), { w, h }, seed);
  return { note: { w, h }, scatter, labels, columns, slots, cols };
}

// Sticky notes for a workshop: they appear scattered, then fly into labelled group columns (an affinity map).
// Scattered notes stay out of the columns of formed groups: when a group forms, they spread again over the columns
// still free. With reduced motion a note cuts to its place instead of flying.
export function stickyNotes(ctx: Ctx, opts: StickyNotesOpts): StickyNotesHandle {
  const groups = opts.groups ?? [];
  const seed = opts.seed ?? 1;
  const { note, scatter, labels, columns, slots, cols } = stickyLayout(opts, opts.notes.length, groups.length, seed);
  const fly = !ctx.reducedMotion;

  const labelEls = groups.map((g, i) => {
    const el = ctx.html.appendChild(document.createElement("div"));
    el.setAttribute("data-k-note-group", g.id);
    el.textContent = g.label;
    const l = labels[i];
    Object.assign(el.style, {
      position: "absolute", left: `${l.x}px`, top: `${l.y}px`, width: `${l.w}px`, height: `${LABEL_H - PAD}px`, boxSizing: "border-box",
      borderBottom: "3px solid var(--k-line)", color: "var(--k-fg)", font: `700 26px/${LINE_H} var(--k-font)`, textAlign: "center",
      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
    });
    gsap.set(el, { autoAlpha: 0 });
    return el;
  });

  const notes = new Map(opts.notes.map((n, i) => {
    const el = ctx.html.appendChild(document.createElement("div"));
    el.setAttribute("data-k-sticky", n.id); // not data-k-note: that one is a note for the speaker view
    const text = el.appendChild(document.createElement("div"));
    text.textContent = n.text;
    Object.assign(text.style, { overflowWrap: "anywhere", maxWidth: "100%" });
    Object.assign(el.style, {
      position: "absolute", left: "0", top: "0", width: `${note.w}px`, height: `${note.h}px`, boxSizing: "border-box", padding: "10px 14px",
      background: `color-mix(in srgb, var(--k-series-${(i % 6) + 1}) ${NOTE_MIX * 100}%, var(--k-bg))`, borderRadius: "4px",
      color: "var(--k-fg)", font: `600 ${FONT}px/${LINE_H} var(--k-font)`, display: "flex", alignItems: "center", justifyContent: "center",
      textAlign: "center", zIndex: "2",
    });
    gsap.set(el, { ...scatter[i], scale: 1, autoAlpha: 0 });
    // Vote dots, hidden until vote() drops them: astride the top edge, left to right, a full row then the next above.
    const per = Math.max(1, Math.floor((note.w - 8) / (DOT + 4)));
    const dots = Array.from({ length: DOTS }, (_, k) => {
      const d = el.appendChild(document.createElement("div"));
      d.setAttribute("data-k-vote", "");
      Object.assign(d.style, {
        position: "absolute", left: `${8 + (k % per) * (DOT + 4)}px`, top: `${-DOT / 2 - Math.floor(k / per) * (DOT + 2)}px`,
        width: `${DOT}px`, height: `${DOT}px`, borderRadius: "50%", background: "var(--k-accent)", boxShadow: "0 0 0 2px var(--k-bg)",
      });
      gsap.set(d, { autoAlpha: 0, scale: 1 });
      return d;
    });
    return [n.id, { el, text, i, dots }] as const;
  }));
  const need = (id: string) => {
    if (!notes.has(id)) throw new Error(`stickyNotes: unknown note "${id}"`);
  };

  // Text is fitted on first use: the layout exists by then, not while building.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    for (const [id, { el, text }] of notes) {
      let size = FONT;
      const over = () => text.offsetHeight > el.clientHeight || text.scrollWidth > text.clientWidth;
      for (; size > FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      el.style.fontSize = `${size}px`;
      if (over()) ctx.problem(`stickyNotes: text of "${id}" too long`);
    }
  };

  // Step-order state, written only inside the adders: adders built out of step order still play in step order.
  const where = new Map<string, { g?: number; k: number }>(); // shown notes; g undefined while scattered
  const pose = new Map<string, NotePose>(); // where each shown note stands after the steps added so far
  const labelled = new Set<number>();
  let last: number | undefined; // the group of the latest group(), its label in the accent until the next one
  const votes = new Map<string, number>(); // dots dropped per note

  // The columns of groups not formed yet, side by side ones as one area.
  const free = () => {
    const out: Rect[] = [];
    columns.forEach((c, g) => {
      if (labelled.has(g)) return;
      const prev = out.at(-1);
      if (prev && !labelled.has(g - 1) && g > 0) prev.w = c.x + c.w - prev.x;
      else out.push({ ...c });
    });
    return out;
  };

  // Moves every shown note to where the state says, from time t: the step's own notes (order) 0.08 s apart.
  const settle = (tl: gsap.core.Timeline, t: number, order: string[]) => {
    const target = new Map<string, NotePose>();
    const scattered = opts.notes.map((n) => n.id).filter((id) => where.get(id)?.g === undefined && where.has(id));
    const areas = free();
    if (!labelled.size) for (const id of scattered) target.set(id, scatter[notes.get(id)!.i]);
    else if (areas.length) {
      const to = scatterIn(areas, scattered.map((id) => notes.get(id)!.i), note, seed);
      scattered.forEach((id, k) => target.set(id, to[k]));
    } else for (const id of scattered) target.set(id, pose.get(id) ?? scatter[notes.get(id)!.i]); // shortcut: once every group formed, left-over notes stay put and may overlap a column
    // A column's notes sit under its label, centred in the height but at most NOTE_GAP below the rule.
    groups.forEach((_, g) => {
      const members = [...where].filter(([, w]) => w.g === g);
      if (!members.length) return;
      const used = Math.ceil((Math.max(...members.map(([, w]) => w.k)) + 1) / cols) * (note.h + PAD) - PAD;
      const off = r2(Math.max(0, Math.min(NOTE_GAP - PAD, (columns[g].h - used) / 2)));
      for (const [id, w] of members) {
        const s = slots[g][w.k] ?? labels[g];
        target.set(id, { x: s.x, y: s.y + off, rotation: 0 });
      }
    });
    const step = fly ? 0.08 : 0.06;
    for (const [id, to] of target) {
      const from = pose.get(id);
      pose.set(id, to);
      if (from && from.x === to.x && from.y === to.y && from.rotation === to.rotation) continue;
      const { el } = notes.get(id)!;
      const at = order.includes(id) ? t + order.indexOf(id) * step : t;
      const grouped = where.get(id)!.g !== undefined;
      if (grouped && (!from || from.rotation !== 0)) tl.set(el, { zIndex: 3, immediateRender: false }, at); // grouped notes fly over the ones still scattered
      if (!from && grouped) tl.fromTo(el, { ...to, scale: 1, autoAlpha: 0 }, { ...to, scale: 1, autoAlpha: 1, duration: 0.4, immediateRender: false }, at);
      else if (!from && fly) tl.fromTo(el, { ...to, autoAlpha: 0, scale: 0.8 }, { ...to, autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false }, at);
      else if (!from) tl.fromTo(el, { ...to, autoAlpha: 0 }, { ...to, autoAlpha: 1, duration: 0.3, immediateRender: false }, at);
      else if (fly) tl.to(el, { ...to, duration: motion.step, ease: "power2.inOut" }, at);
      else tl.set(el, { ...to, immediateRender: false }, at);
    }
    tl.set({}, {}, t + 0.4); // a step that moves nothing still takes a beat
  };

  return {
    show(ids) {
      ids?.forEach(need);
      return (tl) => {
        fit();
        const list = (ids ?? opts.notes.map((n) => n.id)).filter((id) => !where.has(id));
        for (const id of list) where.set(id, { k: -1 });
        settle(tl, tl.duration(), list);
      };
    },
    group(groupId, ids) {
      const g = groups.findIndex((x) => x.id === groupId);
      if (g < 0) throw new Error(`stickyNotes: unknown group "${groupId}"`);
      ids.forEach(need);
      return (tl) => {
        fit();
        const t = tl.duration();
        const prev = last;
        last = g;
        if (prev !== undefined && prev !== g) tl.set(labelEls[prev], { borderBottomColor: "var(--k-line)", immediateRender: false }, t);
        tl.set(labelEls[g], { borderBottomColor: "var(--k-accent)", immediateRender: false }, t);
        if (!labelled.has(g)) {
          labelled.add(g);
          tl.fromTo(labelEls[g], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, t);
        }
        for (const id of ids) {
          const from = where.get(id);
          if (from?.g === g) continue; // already in this group: it stays put
          if (opts.compact && from?.g !== undefined) for (const w of where.values()) if (w.g === from.g && w.k > from.k) w.k--;
          const taken = new Set([...where].filter(([o, w]) => o !== id && w.g === g).map(([, w]) => w.k));
          let k = 0;
          while (taken.has(k)) k++;
          if (k >= slots[g].length) {
            ctx.problem(`stickyNotes: group "${groupId}" is full`);
            k = Math.max(0, slots[g].length - 1); // shortcut: overlaps the last slot; a taller area is the fix
          }
          where.set(id, { g, k });
        }
        settle(tl, t, ids);
      };
    },
    vote(id, n) {
      need(id);
      return (tl) => {
        const t = tl.duration();
        tl.set({}, {}, t + 0.4); // the step still takes a beat
        if (!where.has(id)) return ctx.problem(`stickyNotes: vote on "${id}" before it shows`);
        const had = votes.get(id) ?? 0;
        if (had + n > DOTS) ctx.problem(`stickyNotes: vote on "${id}" past ${DOTS} dots`);
        const to = Math.min(DOTS, had + n);
        votes.set(id, to);
        const dropped = notes.get(id)!.dots.slice(had, to);
        if (!dropped.length) return;
        if (fly) tl.fromTo(dropped, { autoAlpha: 0, scale: 2 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(2)", stagger: 0.1, immediateRender: false }, t);
        else tl.fromTo(dropped, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, t);
      };
    },
  };
}
