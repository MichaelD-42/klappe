import { gsap } from "gsap";
import type { IconNode } from "lucide";
import { MARKER_MIX } from "./annotate";
import { iconGlyph } from "./icons";
import { t as tr } from "../strings";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export type RoadmapOpts = {
  // Dates as "YYYY-MM-DD"; an empty label makes a dot: no stem, no label, out of the spacing. A status settles the dot
  // in its tone and puts its icon before the date.
  milestones: { id: string; date: string; label: string; status?: "done" | "risk" | "late" }[];
  // Spans as bars in lanes under the axis; with phases, every labelled milestone sits above it.
  phases?: { id: string; from: string; to: string; label: string }[];
  today: string; // "YYYY-MM-DD", given by the deck: never the wall clock, so seek equals play and CI sees the same picture
} & Rect;
export interface RoadmapHandle {
  show: StepAdder; // the axis, its month ticks and the today marker
  reveal(id: string): StepAdder; // one milestone or phase appears in --k-accent; it settles on the next roadmap step
  rush(from: string, to: string): StepAdder; // the milestones from one id to the other, in one step, each sooner and harder
  move(date: string): StepAdder; // the today marker moves to date
  el: HTMLElement; // the today marker
}

const SVG = "http://www.w3.org/2000/svg";
// Lucide "check", "triangle-alert" and "clock" (ISC), inline as in comparetable.ts.
const STATUS = {
  done: { tone: "var(--k-ok)", word: "done", icon: [["path", { d: "M20 6 9 17l-5-5" }]] },
  risk: { tone: "var(--k-warn)", word: "atRisk", icon: [["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }], ["path", { d: "M12 9v4" }], ["path", { d: "M12 17h.01" }]] },
  late: { tone: "var(--k-bad)", word: "late", icon: [["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M12 6v6l4 2" }]] },
} as const satisfies Record<string, { tone: string; word: "done" | "atRisk" | "late"; icon: IconNode }>;
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
const RUSH = 0.7; // in a rush, each gap between two landings is this much of the one before
const BAR = 40; // a phase bar's height
const LANE = 48; // one phase lane: the bar and the gap under it
const BAR_TOP = 52; // from the axis to the first lane, clear of the month labels under it
const BAR_FONT = 24;
const PHASE_LIT = `color-mix(in srgb, var(--k-accent) ${MARKER_MIX * 100}%, var(--k-surface))`; // the bar of the phase just revealed

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
// 12 months so they are at least TICK_GAP apart, counted from January so every January gets one; January and the
// first tick carry the year, as does a milestone date on an axis longer than a year. Milestones alternate
// above and below the axis in date order; a label is as wide as its same-side neighbours leave room for.
export function roadmapLayout(opts: Omit<RoadmapOpts, "y" | "h">, lang = "en") {
  const ms = new Map(opts.milestones.map((m) => [m.id, day(m.date)]));
  const today = day(opts.today);
  const spans = (opts.phases ?? []).map((p) => {
    const [a, b] = [day(p.from), day(p.to)];
    if (b < a) throw new Error(`roadmap: phase "${p.id}" ends before it starts`);
    return { ...p, a, b };
  });
  // A phase's bar runs to the end of its last day.
  const all = [...ms.values(), today, ...spans.flatMap((p) => [p.a, p.b])];
  const lo = new Date(Math.min(...all));
  const hi = new Date(Math.max(...all));
  const start = Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth(), 1);
  const months = (hi.getUTCFullYear() - lo.getUTCFullYear()) * 12 + hi.getUTCMonth() - lo.getUTCMonth() + 1;
  const end = Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth() + months, 1);
  const px = (t: number) => r2(opts.x + ((t - start) / (end - start)) * opts.w);
  const stride = [1, 2, 3, 6, 12].find((s) => (opts.w / months) * s >= TICK_GAP) ?? 12;
  const [month, monthYear] = [dateFmt(lang, { month: "short" }), dateFmt(lang, { month: "short", year: "numeric" })];
  const ticks = [];
  for (let i = (stride - (lo.getUTCMonth() % stride)) % stride; i <= months; i += stride) {
    const t = Date.UTC(lo.getUTCFullYear(), lo.getUTCMonth() + i, 1);
    ticks.push({ x: px(t), label: !ticks.length || new Date(t).getUTCMonth() === 0 ? monthYear(t) : month(t) });
  }
  const problems: string[] = [];
  const sorted = [...opts.milestones].sort((a, b) => ms.get(a.id)! - ms.get(b.id)!);
  const lab = sorted.filter((m) => m.label); // a dot (empty label) takes no side and no room
  const xs = lab.map((m) => px(ms.get(m.id)!));
  const short = dateFmt(lang, { day: "numeric", month: "short", ...(months > 12 && { year: "numeric" }) });
  // With phases under the axis every labelled milestone is above it, so its same-side neighbour is the next one.
  const k = spans.length ? 1 : 2;
  const milestones = sorted.map((m) => {
    const x = px(ms.get(m.id)!);
    if (!m.label) return { id: m.id, label: "", x, above: false, left: x, width: 0, date: "", dot: true };
    const i = lab.indexOf(m);
    const gap = (j: number) => (j >= 0 && j < xs.length ? Math.abs(xs[j] - xs[i]) - 16 : Infinity);
    if (gap(i + k) < MIN_W) problems.push(`roadmap: milestones "${m.id}" and "${lab[i + k].id}" are too close`);
    const width = Math.max(MIN_W, Math.min(LABEL_W, gap(i - k), gap(i + k)));
    // Centred on its dot, even at the axis ends, where it reaches past the area by up to half its width.
    return { id: m.id, label: m.label, x, above: k === 1 || i % 2 === 0, left: r2(x - width / 2), width: r2(width), date: short(ms.get(m.id)!), dot: false };
  });
  // Lanes in start order: each phase takes the first lane whose last bar has ended before it starts.
  const ends: number[] = [];
  const phases = [...spans].sort((p, q) => p.a - q.a).map((p) => {
    let lane = ends.findIndex((e) => e < p.a);
    if (lane < 0) lane = ends.push(0) - 1;
    ends[lane] = p.b;
    return { id: p.id, label: p.label, lane, left: px(p.a), width: r2(px(p.b + DAY) - px(p.a)) };
  });
  return { start, end, px, ticks, milestones, phases, today: px(today), problems };
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
    const e = div({ position: "absolute", left: `${t.x - 80}px`, top: `${ay + 14}px`, width: "160px", textAlign: "center", color: "var(--k-muted)", font: `500 ${FLOOR}px/1.2 var(--k-font)`, whiteSpace: "nowrap", zIndex: "3" });
    // Knocked out of the today line like the milestone labels, hugging the text so the line shows beside it.
    Object.assign(e.appendChild(document.createElement("span")).style, { background: "var(--k-bg)", padding: "0 6px" });
    e.firstElementChild!.textContent = t.label;
    gsap.set(e, { autoAlpha: 0 });
    axis.push(e);
  }

  // A milestone: a dot on the axis, a stem to its label, the label (date over title) above or below.
  const statusOf = new Map(opts.milestones.map((m) => [m.id, m.status]));
  const items = new Map<string, { dot: SVGElement; stem?: SVGElement; box?: HTMLElement; inner?: HTMLElement; text?: HTMLElement; tone: string }>(L.milestones.map((m) => {
    const st = statusOf.get(m.id);
    if (st && !(st in STATUS)) ctx.problem(`roadmap: status "${st}" of "${m.id}" is not done, risk or late`);
    const status = st && st in STATUS ? STATUS[st] : undefined;
    const tone = status?.tone ?? "var(--k-line)"; // the dot's settled colour
    const [y0, y1] = m.above ? [ay - DOT, ay - STEM] : [ay + DOT, ay + STEM];
    const stem = m.dot ? undefined : svgEl("line", { x1: m.x, y1: y0, x2: m.x, y2: y1 }, { stroke: "var(--k-line)", strokeWidth: "3" });
    const dot = svgEl("circle", { cx: m.x, cy: ay, r: DOT }, { fill: tone, stroke: "var(--k-bg)", strokeWidth: "3" });
    gsap.set(dot, { scale: 0, svgOrigin: `${m.x} ${ay}` }); // the transform from load, as a seek back over reveal leaves it
    if (m.dot) return [m.id, { dot, tone }];
    const boxH = m.above ? ay - STEM - (opts.y + TODAY_H + 8) : opts.y + opts.h - (ay + STEM);
    const box = div({
      position: "absolute", left: `${m.left}px`, top: `${m.above ? ay - STEM - boxH : ay + STEM}px`, width: `${m.width}px`, height: `${boxH}px`,
      display: "flex", flexDirection: "column", justifyContent: m.above ? "flex-end" : "flex-start", alignItems: "center", textAlign: "center", zIndex: "3",
    });
    box.setAttribute("data-k-roadmap-milestone", m.id);
    const inner = div({ background: "var(--k-bg)", padding: "4px 8px", maxWidth: "100%", boxSizing: "border-box", color: "var(--k-fg)" }, box);
    const date = div({ color: "var(--k-muted)", font: `500 ${FLOOR + 2}px/1.2 var(--k-font)` }, inner);
    date.textContent = m.date;
    if (status) {
      const mark = document.createElement("span");
      Object.assign(mark.style, { display: "inline-block", width: "1em", height: "1em", marginRight: "6px", verticalAlign: "-0.15em", color: status.tone });
      mark.setAttribute("role", "img");
      mark.setAttribute("aria-label", tr(status.word, lang));
      mark.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${iconGlyph(status.icon as IconNode, ctx.problem)}</svg>`;
      date.prepend(mark);
    }
    const text = div({ font: `700 ${MAX_FONT}px/${LINE_H} var(--k-font)`, overflowWrap: "anywhere" }, inner);
    text.textContent = m.label;
    gsap.set(box, { autoAlpha: 0, scale: 1, transformOrigin: m.above ? "50% 100%" : "50% 0%" }); // the transform from load, as a rush's pop leaves it
    return [m.id, { stem, dot, box, inner, text, tone }];
  }));

  // A phase: a bar in its lane under the axis, its label inside; it grows from its start.
  const room = opts.y + opts.h - (ay + BAR_TOP);
  const lanes = Math.max(0, ...L.phases.map((p) => p.lane + 1));
  if (lanes * LANE > room) ctx.problem(`roadmap: ${lanes} phase lanes do not fit under the axis`);
  const bars = new Map(L.phases.map((p) => {
    const bar = div({
      position: "absolute", left: `${p.left}px`, top: `${ay + BAR_TOP + p.lane * LANE}px`, width: `${p.width}px`, height: `${BAR}px`,
      boxSizing: "border-box", borderRadius: "8px", border: "2px solid var(--k-line)", background: "var(--k-surface)", color: "var(--k-fg)",
      display: "flex", alignItems: "center", padding: "0 12px", overflow: "hidden", zIndex: "1",
    });
    bar.setAttribute("data-k-roadmap-phase", p.id);
    const text = div({ font: `700 ${BAR_FONT}px/1 var(--k-font)`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, bar);
    text.textContent = p.label;
    gsap.set(bar, { autoAlpha: 0, scaleX: ctx.reducedMotion ? 1 : 0, transformOrigin: "0% 50%" }); // as a seek back over reveal leaves it
    return [p.id, { bar, text }];
  }));
  for (const id of bars.keys()) if (items.has(id)) throw new Error(`roadmap: "${id}" is both a milestone and a phase`);

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
      if (!box || !inner || !text) continue;
      let size = MAX_FONT;
      const over = () => text.offsetHeight > LINE_H * size * MAX_LINES + 1 || inner.offsetHeight > box.clientHeight || text.scrollWidth > text.clientWidth;
      for (; size > FLOOR; size -= 2) {
        text.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      text.style.fontSize = `${size}px`;
      if (over()) ctx.problem(`roadmap: label of "${id}" too long`);
    }
    for (const [id, { text }] of bars) {
      let size = BAR_FONT;
      const over = () => text.scrollWidth > text.clientWidth;
      for (; size > FLOOR; size -= 2) {
        text.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      text.style.fontSize = `${size}px`;
      if (over()) ctx.problem(`roadmap: label of phase "${id}" too long for its bar`);
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

  // Milestones land in one step, in --k-accent until the next roadmap step. In a rush the first gap is one step, each next
  // gap RUSH times the one before, and each landing pops harder (punch 0 to 1). With reduced motion the cadence stays: dots show at once, labels never pop.
  const land = (ids: string[]) => (tl: gsap.core.Timeline) => {
    const its = ids.map((id) => items.get(id)!);
    // dot: null settles each dot to its own tone (its status, else --k-line).
    const paint = (tl: gsap.core.Timeline, dot: string | null, fg: string, t: number) =>
      its.forEach((it) => {
        set(tl, it.dot, { fill: dot ?? it.tone }, t);
        if (it.stem) set(tl, it.stem, { stroke: dot ?? "var(--k-line)" }, t);
        if (it.inner) set(tl, it.inner, { color: fg }, t);
      });
    const t = begin(tl, (tl, t) => paint(tl, null, "var(--k-fg)", t));
    paint(tl, "var(--k-accent)", "var(--k-accent)", t);
    its.forEach((it, k) => {
      const at = t + (motion.step * (1 - RUSH ** k)) / (1 - RUSH);
      const punch = k / Math.max(1, its.length - 1);
      if (ctx.reducedMotion) set(tl, it.dot, { autoAlpha: 1, scale: 1 }, at);
      else tl.fromTo(it.dot, { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.4, ease: `back.out(${2 + 2 * punch})`, immediateRender: false }, at);
      if (!it.box) return;
      tl.to([it.stem, it.box], { autoAlpha: 1, duration: 0.4 }, at + 0.2);
      // Out and back to the load scale, so a seek back over it leaves the label as it was.
      if (punch && !ctx.reducedMotion) tl.to(it.box, { scale: 1 + 0.15 * punch, duration: 0.15, ease: "power2.out", yoyo: true, repeat: 1 }, at + 0.2);
    });
  };
  const find = (id: string) => {
    const i = L.milestones.findIndex((m) => m.id === id);
    if (i < 0) throw new Error(`roadmap: unknown milestone "${id}"`);
    return i;
  };

  return {
    el: marker,
    show(tl) {
      const t = begin(tl);
      tl.to(axis, { autoAlpha: 1, duration: 0.4 }, t);
      tl.to(marker, { autoAlpha: 1, duration: 0.4 }, t + 0.3);
    },
    reveal(id) {
      const ph = bars.get(id);
      if (ph)
        return (tl) => {
          const t = begin(tl, (tl, t) => set(tl, ph.bar, { borderColor: "var(--k-line)", backgroundColor: "var(--k-surface)" }, t));
          set(tl, ph.bar, { borderColor: "var(--k-accent)", backgroundColor: PHASE_LIT }, t);
          // Reduced motion fades the bar in at full length.
          if (ctx.reducedMotion) tl.fromTo(ph.bar, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, t);
          else {
            set(tl, ph.bar, { autoAlpha: 1 }, t);
            tl.fromTo(ph.bar, { scaleX: 0 }, { scaleX: 1, duration: motion.step * 1.5, ease: "power2.out", immediateRender: false }, t);
          }
        };
      find(id);
      return land([id]);
    },
    rush(from, to) {
      const [i, j] = [find(from), find(to)];
      if (i > j) throw new Error(`roadmap: rush "${from}" comes after "${to}"`);
      return land(L.milestones.slice(i, j + 1).map((m) => m.id));
    },
    move(date) {
      let to = day(date);
      if (to < L.start || to >= L.end) {
        ctx.problem(`roadmap: today "${date}" is outside the axis`);
        to = Math.min(Math.max(to, L.start), L.end - DAY);
      }
      // The start date is read when the step is added, not here: adders built out of step order still move in step order.
      return (tl) => {
        const from = todayMs;
        todayMs = to;
        const t = begin(tl, (tl, t) => {
          set(tl, line, { backgroundColor: "var(--k-fg)" }, t);
          set(tl, head, { color: "var(--k-fg)" }, t);
        });
        set(tl, line, { backgroundColor: "var(--k-accent)" }, t);
        set(tl, head, { color: "var(--k-accent)" }, t);
        // The date counts along with the marker: a pure function of the tween's eased progress.
        tl.fromTo(marker, { x: L.px(from) }, {
          // Reduced motion jumps: a zero-length tween still writes the date at ratio 1, and at ratio 0 on a seek back.
          x: L.px(to), duration: ctx.reducedMotion ? 0 : motion.step * 2, ease: ctx.reducedMotion ? "none" : "power2.inOut", immediateRender: false,
          onUpdate(this: gsap.core.Tween) {
            when.textContent = long(Math.round((from + (to - from) * this.ratio) / DAY) * DAY);
          },
        }, t);
      };
    },
  };
}
