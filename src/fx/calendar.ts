import { gsap } from "gsap";
import { MARKER_MIX } from "./annotate";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export type CalendarOpts = {
  month: string; // "2026-11"
  weekStart?: 0 | 1; // the first column: 1 Monday (default), 0 Sunday
} & Rect;
export interface CalendarHandle {
  show: StepAdder; // the title, weekday names and day cells fade in
  mark(date: string, opts?: { label?: string }): StepAdder; // a day lights in the accent, with a short label in its cell
  span(from: string, to: string, opts?: { label?: string }): StepAdder; // a bar across the days, one piece per week, drawn left to right
}
export interface CalendarDay { date: string; day: number; col: number; row: number; x: number; y: number; w: number; h: number }
export interface CalendarLayout { days: CalendarDay[]; rows: number; title: Rect; weekdays: Rect[]; problems: string[] }

const TITLE_H = 60;
const WEEKDAY_H = 40;
const GAP = 6; // between cells
const MIN_W = 80; // a day narrower than this cannot hold a label at the floor
const BAR = 30; // a span bar's height
const FLOOR = 20; // legibility floor, scene px

// The month's days on a 7-column grid, one row per week it touches, below a title and a weekday band. Dates are
// UTC, so no time zone moves a day. Pure, for tests.
export function calendarLayout(month: string, weekStart: 0 | 1, r: Rect): CalendarLayout {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  if (!m) return { days: [], rows: 0, title: r, weekdays: [], problems: [`calendar: month "${month}" is not YYYY-MM`] };
  const [y, mo] = [+m[1], +m[2] - 1];
  const count = new Date(Date.UTC(y, mo + 1, 0)).getUTCDate();
  const lead = (new Date(Date.UTC(y, mo, 1)).getUTCDay() - weekStart + 7) % 7;
  const rows = Math.ceil((lead + count) / 7);
  const cw = r.w / 7;
  const top = r.y + TITLE_H + WEEKDAY_H;
  const ch = (r.y + r.h - top) / rows;
  const problems = cw - GAP < MIN_W ? [`calendar: a ${r.w}px wide grid has days under ${MIN_W}px; widen the rect`] : [];
  const days = Array.from({ length: count }, (_, i) => {
    const [col, row] = [(lead + i) % 7, Math.floor((lead + i) / 7)];
    return { date: `${m[1]}-${m[2]}-${String(i + 1).padStart(2, "0")}`, day: i + 1, col, row, x: r.x + col * cw, y: top + row * ch, w: cw - GAP, h: ch - GAP };
  });
  // The last column's and row's cells end at the rect's edge: their gap sits on the inside.
  for (const d of days) {
    if (d.col === 6) d.w = cw;
    if (d.row === rows - 1) d.h = ch;
  }
  const weekdays = Array.from({ length: 7 }, (_, c) => ({ x: r.x + c * cw, y: r.y + TITLE_H, w: cw - GAP, h: WEEKDAY_H }));
  return { days, rows, title: { x: r.x, y: r.y, w: r.w, h: TITLE_H }, weekdays, problems };
}

// The days from..to as one bar per week row: { row, from, to } in columns. Pure, for tests.
export function calendarSpan(l: CalendarLayout, from: string, to: string): { row: number; from: number; to: number }[] {
  const days = l.days.filter((d) => d.date >= from && d.date <= to);
  const rows = [...new Set(days.map((d) => d.row))];
  return rows.map((row) => {
    const cols = days.filter((d) => d.row === row).map((d) => d.col);
    return { row, from: Math.min(...cols), to: Math.max(...cols) };
  });
}

// A month on a grid for deadlines, sprints and course plans: mark lights a day, span draws a bar across days.
// Weekday names and the title come from the deck language. The newest mark or span is in the accent until the
// next one; earlier ones stay as a tint.
export function calendar(ctx: Ctx, opts: CalendarOpts): CalendarHandle {
  const lay = calendarLayout(opts.month, opts.weekStart ?? 1, opts);
  lay.problems.forEach((p) => ctx.problem(p));
  const lang = ctx.deck.lang;
  const div = (r: Rect, css: Partial<CSSStyleDeclaration>, text = "") => {
    const e = ctx.html.appendChild(document.createElement("div"));
    e.textContent = text;
    Object.assign(e.style, { position: "absolute", boxSizing: "border-box", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, ...css });
    return e;
  };
  const base: HTMLElement[] = [];
  const m = /^(\d{4})-(\d{2})$/.exec(opts.month);
  if (m) {
    const first = new Date(Date.UTC(+m[1], +m[2] - 1, 1));
    base.push(div(lay.title, { color: "var(--k-fg)", font: "700 40px/60px var(--k-font)" }, new Intl.DateTimeFormat(lang, { month: "long", year: "numeric", timeZone: "UTC" }).format(first)));
    // A known week from Sunday 2026-11-01 gives each column's name.
    const name = new Intl.DateTimeFormat(lang, { weekday: "short", timeZone: "UTC" });
    lay.weekdays.forEach((r, c) => base.push(div(r, { color: "var(--k-muted)", font: `600 ${FLOOR + 2}px/40px var(--k-font)`, paddingLeft: "10px" }, name.format(new Date(Date.UTC(2026, 10, 1 + ((c + (opts.weekStart ?? 1)) % 7)))))));
  }
  const cells = new Map(lay.days.map((d) => {
    const e = div(d, { border: "2px solid var(--k-line)", borderRadius: "8px", background: "var(--k-surface)", color: "var(--k-fg)", font: "600 24px/1 var(--k-font)", padding: "8px 10px" }, String(d.day));
    e.dataset.kDay = d.date;
    base.push(e);
    return [d.date, d] as const;
  }));
  gsap.set(base, { autoAlpha: 0 });

  const tint = `color-mix(in srgb, var(--k-accent) ${MARKER_MIX * 100}%, var(--k-surface))`;
  // The newest mark or span keeps an accent edge until the next one: its element and the edge it settles to.
  let hot: { els: HTMLElement[]; settle: gsap.TweenVars } | undefined;
  const lanes = new Map<number, number>(); // spans so far per week row: each new one stacks above
  const step = (tl: gsap.core.Timeline, els: HTMLElement[], settle: gsap.TweenVars) => {
    const at = tl.duration();
    if (hot) tl.set(hot.els, { ...hot.settle, immediateRender: false }, at);
    hot = { els, settle };
    return at;
  };
  const known = (date: string) => cells.has(date) || void ctx.problem(`calendar: ${date} is not in ${opts.month}`);
  return {
    show(tl) {
      const at = tl.duration();
      if (!base.length) return void tl.set({}, {}, at + 0.4); // a bad month drew nothing
      tl.to(base.slice(0, 8), { autoAlpha: 1, duration: motion.step }, at);
      tl.to(base.slice(8), { autoAlpha: 1, duration: 0.3, stagger: 0.012 }, at + 0.2);
    },
    mark: (date, o = {}) => {
      const d = cells.get(date);
      const el = d && div(d, { border: "4px solid var(--k-accent)", borderRadius: "8px", background: tint, color: "var(--k-fg)", font: "600 24px/1 var(--k-font)", padding: "8px 10px", zIndex: "1" }, String(d.day));
      if (el && o.label) {
        const t = el.appendChild(document.createElement("div"));
        t.textContent = o.label;
        Object.assign(t.style, { marginTop: "8px", font: `600 ${FLOOR}px/1.2 var(--k-font)`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" });
      }
      if (el) {
        el.dataset.kMark = date;
        gsap.set(el, { autoAlpha: 0, scale: 0.9 }); // the transform written at load, as a seek back leaves it
      }
      return (tl) => {
        if (!known(date) || !el) return void tl.set({}, {}, tl.duration() + 0.4);
        const at = step(tl, [el], { borderColor: "var(--k-line)" });
        tl.fromTo(el, { autoAlpha: 0, scale: 0.9 }, { autoAlpha: 1, scale: 1, duration: motion.step, ease: "back.out(2)", immediateRender: false }, at);
      };
    },
    span: (from, to, o = {}) => {
      const bars = cells.has(from) && cells.has(to) && from <= to ? calendarSpan(lay, from, to) : [];
      const els = bars.map((b, k) => {
        const lane = lanes.get(b.row) ?? 0;
        lanes.set(b.row, lane + 1);
        const [a, z] = [lay.days.find((d) => d.row === b.row && d.col === b.from)!, lay.days.find((d) => d.row === b.row && d.col === b.to)!];
        const r = { x: a.x + 6, y: a.y + a.h - 8 - BAR - lane * (BAR + 4), w: z.x + z.w - a.x - 12, h: BAR };
        const e = div(r, { borderRadius: "6px", background: "var(--k-accent)", color: "var(--k-bg)", font: `700 ${FLOOR}px/${BAR}px var(--k-font)`, padding: "0 10px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", zIndex: "2" }, k === 0 ? (o.label ?? "") : "");
        e.dataset.kSpan = `${from}..${to}`;
        gsap.set(e, { autoAlpha: 0, scaleX: 0, transformOrigin: "0 50%" });
        return e;
      });
      return (tl) => {
        if (!known(from) || !known(to) || from > to) {
          if (from > to) ctx.problem(`calendar: span from ${from} ends before it starts (${to})`);
          return void tl.set({}, {}, tl.duration() + 0.4);
        }
        const at = step(tl, els, { background: tint, color: "var(--k-fg)" });
        // One bar after another, as a pen draws across the weeks.
        els.forEach((e, k) => tl.fromTo(e, { autoAlpha: 1, scaleX: 0 }, { autoAlpha: 1, scaleX: 1, duration: 0.5, ease: "power1.inOut", immediateRender: false }, at + k * 0.45));
      };
    },
  };
}
