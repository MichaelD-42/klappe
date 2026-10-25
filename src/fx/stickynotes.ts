import { gsap } from "gsap";
import { motion } from "../theme";
import { rand } from "./swarm";
import type { Ctx, Rect, StepAdder } from "../types";

export type StickyNotesOpts = {
  notes: { id: string; text: string }[];
  groups?: { id: string; label: string }[];
  seed?: number; // picks the scatter; default 1
} & Rect;
export interface StickyNotesHandle {
  show(ids?: string[]): StepAdder;
  group(groupId: string, ids: string[]): StepAdder;
}
export type NotePose = { x: number; y: number; rotation: number };

export const NOTE_MIX = 0.3; // the share of the series colour in a note, the rest --k-bg; --k-fg on it holds 5.9:1 or more in every built-in theme
const PAD = 16;
const COL_GAP = 32;
const LABEL_H = 56; // the band at the top of a group column for its label
const MIN_W = 180;
const MAX_W = 240;
const TILT = 4; // the most a scattered note leans, degrees
const FONT = 22;
const FLOOR = 20; // legibility floor, scene px
const LINE_H = 1.2;

const r2 = (n: number) => Math.round(n * 100) / 100;

// The note size, each note's scattered pose (a seeded jittered grid, so no two overlap while cells last), each
// group's label band and each group's note slots, filled row by row under the label.
export function stickyLayout(rect: Rect, n: number, groups: number, seed = 1): { note: { w: number; h: number }; scatter: NotePose[]; labels: Rect[]; slots: Rect[][] } {
  const cw = groups ? (rect.w - (groups - 1) * COL_GAP) / groups : rect.w;
  const cols = groups ? Math.max(1, Math.floor((cw + PAD) / (MIN_W + PAD))) : 1;
  const w = r2(groups ? Math.min(MAX_W, (cw - (cols - 1) * PAD) / cols) : MAX_W);
  const h = r2(w * 0.7);
  const labels = Array.from({ length: groups }, (_, g) => ({ x: r2(rect.x + g * (cw + COL_GAP)), y: rect.y, w: r2(cw), h: LABEL_H }));
  const rows = Math.max(0, Math.floor((rect.h - LABEL_H) / (h + PAD)));
  const inset = (cw - (cols * w + (cols - 1) * PAD)) / 2;
  const slots = labels.map((l) =>
    Array.from({ length: rows * cols }, (_, k) => ({ x: r2(l.x + inset + (k % cols) * (w + PAD)), y: r2(l.y + LABEL_H + Math.floor(k / cols) * (h + PAD)), w, h })),
  );

  // Scattered notes keep out of the label band, so a label that fades in later is never under one.
  const top = groups ? rect.y + LABEL_H : rect.y;
  const area = { x: rect.x, y: top, w: rect.w, h: rect.y + rect.h - top };
  const [cx, cy] = [Math.max(1, Math.floor(area.w / (w * 1.15))), Math.max(1, Math.floor(area.h / (h * 1.15)))];
  const [cellW, cellH] = [area.w / cx, area.h / cy];
  const cells = Array.from({ length: cx * cy }, (_, c) => c).sort((a, b) => rand(seed, a, 0) - rand(seed, b, 0));
  const slack = 8; // room for the lean at each cell side
  const scatter = Array.from({ length: n }, (_, i) => {
    const c = cells[i % cells.length]; // shortcut: more notes than cells overlap; a bigger area is the fix
    const jx = Math.max(0, cellW - w - 2 * slack) * rand(seed, i, 1);
    const jy = Math.max(0, cellH - h - 2 * slack) * rand(seed, i, 2);
    return { x: r2(area.x + (c % cx) * cellW + slack + jx), y: r2(area.y + Math.floor(c / cx) * cellH + slack + jy), rotation: r2((rand(seed, i, 3) * 2 - 1) * TILT) };
  });
  return { note: { w, h }, scatter, labels, slots };
}

// Sticky notes for a workshop: they appear scattered, then fly into labelled group columns (an affinity map).
// With reduced motion a note cuts to its group instead of flying.
export function stickyNotes(ctx: Ctx, opts: StickyNotesOpts): StickyNotesHandle {
  const groups = opts.groups ?? [];
  const { note, scatter, labels, slots } = stickyLayout(opts, opts.notes.length, groups.length, opts.seed ?? 1);
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
    el.setAttribute("data-k-note", n.id);
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
    return [n.id, { el, text, i }] as const;
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
  const labelled = new Set<number>();
  let last: number | undefined; // the group of the latest group(), its label in the accent until the next one

  return {
    show(ids) {
      ids?.forEach(need);
      return (tl) => {
        fit();
        const t = tl.duration();
        const list = (ids ?? opts.notes.map((n) => n.id)).filter((id) => !where.has(id));
        list.forEach((id, j) => {
          where.set(id, { k: -1 });
          const { el } = notes.get(id)!;
          if (fly) tl.fromTo(el, { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false }, t + j * 0.08);
          else tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, immediateRender: false }, t + j * 0.06);
        });
        tl.set({}, {}, t + 0.4); // a show of notes already out still takes a beat
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
        ids.forEach((id, j) => {
          const from = where.get(id);
          if (from?.g === g) return; // already in this group: it stays put
          const taken = new Set([...where].filter(([o, w]) => o !== id && w.g === g).map(([, w]) => w.k));
          let k = 0;
          while (taken.has(k)) k++;
          if (k >= slots[g].length) {
            ctx.problem(`stickyNotes: group "${groupId}" is full`);
            k = Math.max(0, slots[g].length - 1); // shortcut: overlaps the last slot; a taller area is the fix
          }
          where.set(id, { g, k });
          const s = slots[g][k] ?? labels[g];
          const { el } = notes.get(id)!;
          const at = t + j * 0.08;
          const to = { x: s.x, y: s.y, rotation: 0 };
          tl.set(el, { zIndex: 3, immediateRender: false }, at); // grouped notes fly over the ones still scattered
          if (!from) tl.fromTo(el, { ...to, scale: 1, autoAlpha: 0 }, { ...to, scale: 1, autoAlpha: 1, duration: 0.4, immediateRender: false }, at);
          else if (fly) tl.to(el, { ...to, duration: motion.step, ease: "power2.inOut" }, at);
          else tl.set(el, to, at);
        });
        tl.set({}, {}, t + 0.4);
      };
    },
  };
}
