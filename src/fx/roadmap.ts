import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export type RoadmapOpts = {
  milestones: { id: string; date: string; label: string }[]; // dates as "YYYY-MM-DD"
  today: string; // "YYYY-MM-DD", given by the deck: never the wall clock, so seek equals play and CI sees the same picture
} & Rect;
export interface RoadmapHandle {
  show: StepAdder; // the axis, its month ticks and the today marker
  reveal(id: string): StepAdder; // one milestone appears in --k-accent; it settles when the next step starts
  move(date: string): StepAdder; // the today marker moves to date
  el: HTMLElement; // the today marker
}

const SVG = "http://www.w3.org/2000/svg";
const DAY = 86400000;
const LABEL_W = 300; // widest milestone label, scene px
const MIN_W = 160; // narrower than this, two labels on one side are too close
const TICK_GAP = 120; // the least room between two month ticks
const TODAY_H = 72; // the band above the axis area that holds the today label
const STEM = 52; // from the axis to a milestone label
const DOT = 12; // milestone dot radius
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 28;
const MAX_LINES = 3;
const LINE_H = 1.2;

// ms since the epoch, UTC midnight; throws on anything but a real "YYYY-MM-DD".
function day(s: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  const ms = m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN;
  if (!m || new Date(ms).getUTCDate() !== +m[3]) throw new Error(`roadmap: date "${s}" is not YYYY-MM-DD`);
  return ms;
}
// UTC everywhere, so a viewer's time zone never shifts a date by a day.
const dateFmt = (lang: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(lang, { timeZone: "UTC", ...o }).format;
const r2 = (n: number) => Math.round(n * 100) / 100;

// The axis spans whole months around the milestones and today. Ticks fall on month starts, every 1, 2, 3, 6 or
// 12 months so they are at least TICK_GAP apart; January and the first tick carry the year. Milestones alternate
// above and below the axis in date order; a label is as wide as its same-side neighbours leave room for.
export function roadmapLayout(opts: Omit<RoadmapOpts, "y" | "h">, lang = "en") {
  const ms = new Map(opts.milestones.map((m) => [m.id, day(m.date)]));
  const today = day(opts.today);
  const all = [...ms.values(), today];
  const lo = new Date(Math.min(...all));
  const hi = new Date(Math.max(...all));
  const start = Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth(), 1);
  const months = (hi.getUTCFullYear() - lo.getUTCFullYear()) * 12 + hi.getUTCMonth() - lo.getUTCMonth() + 1;
  const end = Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth() + months, 1);
  const px = (t: number) => r2(opts.x + ((t - start) / (end - start)) * opts.w);
  const stride = [1, 2, 3, 6, 12].find((s) => (opts.w / months) * s >= TICK_GAP) ?? 12;
  const [month, monthYear] = [dateFmt(lang, { month: "short" }), dateFmt(lang, { month: "short", year: "numeric" })];
  const ticks = [];
  for (let i = 0; i <= months; i += stride) {
    const t = Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth() + i, 1);
    ticks.push({ x: px(t), label: i === 0 || new Date(t).getUTCMonth() === 0 ? monthYear(t) : month(t) });
  }
  const problems: string[] = [];
  const sorted = [...opts.milestones].sort((a, b) => ms.get(a.id)! - ms.get(b.id)!);
  const xs = sorted.map((m) => px(ms.get(m.id)!));
  const short = dateFmt(lang, { day: "numeric", month: "short" });
  const milestones = sorted.map((m, i) => {
    const gap = (j: number) => (j >= 0 && j < xs.length ? Math.abs(xs[j] - xs[i]) - 16 : Infinity);
    if (gap(i + 2) < MIN_W) problems.push(`roadmap: milestones "${m.id}" and "${sorted[i + 2].id}" are too close`);
    const width = Math.max(MIN_W, Math.min(LABEL_W, gap(i - 2), gap(i + 2)));
    // Centred on its dot, even at the axis ends, where it reaches past the area by up to half its width.
    return { id: m.id, label: m.label, x: xs[i], above: i % 2 === 0, left: r2(xs[i] - width / 2), width: r2(width), date: short(ms.get(m.id)!) };
  });
  return { start, end, px, ticks, milestones, today: px(today), problems };
}

// A time axis with milestones that appear one per step and a "today" marker that moves step by step.
// Dates are written in the deck language.
export function roadmap(ctx: Ctx, opts: RoadmapOpts): RoadmapHandle {
  const lang = ctx.deck.lang;
  const L = roadmapLayout(opts, lang);
  for (const p of L.problems) ctx.problem(p);
  const ay = opts.y + TODAY_H + (opts.h - TODAY_H) / 2;
  const svgEl = (tag: string, attrs: Record<string, number | string>, style: Partial<CSSStyleDeclaration>) => {
    const e = document.createElementNS(SVG, tag) as SVGElement;
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    Object.assign(e.style, style);
    ctx.svg.append(e);
    gsap.set(e, { autoAlpha: 0 });
    return e;
  };
  const div = (style: Partial<CSSStyleDeclaration>, parent: HTMLElement = ctx.html) => {
    const e = parent.appendChild(document.createElement("div"));
    Object.assign(e.style, style);
    return e;
  };

  const axis: Element[] = [svgEl("line", { x1: opts.x, y1: ay, x2: opts.x + opts.w, y2: ay }, { stroke: "var(--k-line)", strokeWidth: "4" })];
  for (const t of L.ticks) {
    axis.push(svgEl("line", { x1: t.x, y1: ay - 10, x2: t.x, y2: ay + 10 }, { stroke: "var(--k-line)", strokeWidth: "2" }));
    const e = div({ position: "absolute", left: `${t.x - 80}px`, top: `${ay + 14}px`, width: "160px", textAlign: "center", color: "var(--k-muted)", font: `500 ${FLOOR}px/1.2 var(--k-font)`, whiteSpace: "nowrap", zIndex: "1" });
    e.textContent = t.label;
    gsap.set(e, { autoAlpha: 0 });
    axis.push(e);
  }

  // A milestone: a dot on the axis, a stem to its label, the label (date over title) above or below.
  const items = new Map(L.milestones.map((m) => {
    const [y0, y1] = m.above ? [ay - DOT, ay - STEM] : [ay + DOT, ay + STEM];
    const stem = svgEl("line", { x1: m.x, y1: y0, x2: m.x, y2: y1 }, { stroke: "var(--k-line)", strokeWidth: "3" });
    const dot = svgEl("circle", { cx: m.x, cy: ay, r: DOT }, { fill: "var(--k-line)", stroke: "var(--k-bg)", strokeWidth: "3" });
    gsap.set(dot, { scale: 0, svgOrigin: `${m.x} ${ay}` }); // the transform from load, as a seek back over reveal leaves it
    const boxH = m.above ? ay - STEM - (opts.y + TODAY_H + 8) : opts.y + opts.h - (ay + STEM);
    const box = div({
      position: "absolute", left: `${m.left}px`, top: `${m.above ? ay - STEM - boxH : ay + STEM}px`, width: `${m.width}px`, height: `${boxH}px`,
      display: "flex", flexDirection: "column", justifyContent: m.above ? "flex-end" : "flex-start", alignItems: "center", textAlign: "center", zIndex: "3",
    });
    box.setAttribute("data-k-roadmap-milestone", m.id);
    const inner = div({ background: "var(--k-bg)", padding: "4px 8px", maxWidth: "100%", boxSizing: "border-box", color: "var(--k-fg)" }, box);
    div({ color: "var(--k-muted)", font: `500 ${FLOOR + 2}px/1.2 var(--k-font)` }, inner).textContent = m.date;
    const text = div({ font: `700 ${MAX_FONT}px/${LINE_H} var(--k-font)`, overflowWrap: "anywhere" }, inner);
    text.textContent = m.label;
    gsap.set(box, { autoAlpha: 0 });
    return [m.id, { stem, dot, box, inner, text }];
  }));

  // The today marker: a line through the area and its label on top; moves by x, so a step never edits layout.
  const marker = div({ position: "absolute", left: "0", top: `${opts.y}px`, width: "0", height: `${opts.h}px`, zIndex: "2", pointerEvents: "none" });
  marker.setAttribute("data-k-roadmap-today", "");
  const word = new Intl.RelativeTimeFormat(lang, { numeric: "auto" }).format(0, "day");
  const head = div({ position: "absolute", left: "0", top: "0", transform: "translateX(-50%)", textAlign: "center", whiteSpace: "nowrap", color: "var(--k-fg)", font: `700 24px/1.2 var(--k-font)` }, marker);
  div({}, head).textContent = word.charAt(0).toLocaleUpperCase(lang) + word.slice(1);
  const when = div({ fontVariantNumeric: "tabular-nums", fontWeight: "500" }, head);
  const long = dateFmt(lang, { day: "numeric", month: "short", year: "numeric" });
  when.setAttribute("data-k-text", "");
  when.textContent = long(day(opts.today));
  const line = div({ position: "absolute", left: "-2px", top: `${TODAY_H - 8}px`, width: "4px", height: `${opts.h - TODAY_H + 8}px`, background: "var(--k-fg)" }, marker);
  gsap.set(marker, { autoAlpha: 0, x: L.today }); // the transform from load, as a seek back over a move leaves it

  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    for (const [id, { box, inner, text }] of items) {
      let size = MAX_FONT;
      const over = () => text.offsetHeight > LINE_H * size * MAX_LINES + 1 || inner.offsetHeight > box.clientHeight || text.scrollWidth > text.clientWidth;
      for (; size > FLOOR; size -= 2) {
        text.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      text.style.fontSize = `${size}px`;
      if (over()) ctx.problem(`roadmap: label of "${id}" too long`);
    }
  };

  // The last step's accent, undone with sets (so they seek) when the next step starts.
  let settle: ((tl: gsap.core.Timeline, t: number) => void) | undefined;
  const begin = (tl: gsap.core.Timeline, next?: (tl: gsap.core.Timeline, t: number) => void) => {
    fit();
    const t = tl.duration();
    settle?.(tl, t);
    settle = next;
    return t;
  };
  const set = (tl: gsap.core.Timeline, el: Element, vars: gsap.TweenVars, t: number) => tl.set(el, { ...vars, immediateRender: false }, t);
  let todayMs = day(opts.today);

  return {
    el: marker,
    show(tl) {
      const t = begin(tl);
      tl.to(axis, { autoAlpha: 1, duration: 0.4 }, t);
      tl.to(marker, { autoAlpha: 1, duration: 0.4 }, t + 0.3);
    },
    reveal(id) {
      const it = items.get(id);
      if (!it) throw new Error(`roadmap: unknown milestone "${id}"`);
      return (tl) => {
        const t = begin(tl, (tl, t) => {
          set(tl, it.dot, { fill: "var(--k-line)" }, t);
          set(tl, it.stem, { stroke: "var(--k-line)" }, t);
          set(tl, it.inner, { color: "var(--k-fg)" }, t);
        });
        set(tl, it.dot, { fill: "var(--k-accent)" }, t);
        set(tl, it.stem, { stroke: "var(--k-accent)" }, t);
        set(tl, it.inner, { color: "var(--k-accent)" }, t);
        tl.fromTo(it.dot, { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: "back.out(2)", immediateRender: false }, t);
        tl.to([it.stem, it.box], { autoAlpha: 1, duration: 0.4 }, t + 0.2);
      };
    },
    move(date) {
      let to = day(date);
      if (to < L.start || to >= L.end) {
        ctx.problem(`roadmap: today "${date}" is outside the axis`);
        to = Math.min(Math.max(to, L.start), L.end - DAY);
      }
      const from = todayMs;
      todayMs = to;
      return (tl) => {
        const t = begin(tl, (tl, t) => {
          set(tl, line, { backgroundColor: "var(--k-fg)" }, t);
          set(tl, head, { color: "var(--k-fg)" }, t);
        });
        set(tl, line, { backgroundColor: "var(--k-accent)" }, t);
        set(tl, head, { color: "var(--k-accent)" }, t);
        // The date counts along with the marker: a pure function of the tween's eased progress.
        tl.fromTo(marker, { x: L.px(from) }, {
          x: L.px(to), duration: motion.step * 2, ease: "power2.inOut", immediateRender: false,
          onUpdate(this: gsap.core.Tween) {
            when.textContent = long(Math.round((from + (to - from) * this.ratio) / DAY) * DAY);
          },
        }, t);
      };
    },
  };
}
