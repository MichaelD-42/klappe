import * as d3 from "d3";
import { gsap } from "gsap";
import { t } from "../strings";
import { counterText } from "./motion";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

// Single numbers for a board: a KPI tile with its trend, a waffle for a share, a ring for progress to a target.
// Each takes its numbers directly; source goes to the speaker notes, as a chart's does.

export interface KpiOpts {
  x: number; // top-left corner, scene-local
  y: number;
  w?: number; // default 480
  value: number;
  label: string;
  unit?: string; // after the number, smaller: "%", "days"
  previous?: number; // last period: the tile shows the change against it
  better?: "up" | "down"; // which way is good; default "up". "down" for lead time, cost, defects
  spark?: number[]; // the recent values, oldest first, ending with value
  source?: string;
}
export interface WaffleOpts {
  x: number;
  y: number;
  size: number; // the grid's width and height
  value: number;
  of?: number; // the whole; default 100
  label?: string;
  source?: string;
}
export interface ProgressOpts {
  x: number;
  y: number;
  size: number; // the ring's diameter
  value: number;
  target: number;
  label?: string;
  source?: string;
}
export interface StatHandle {
  show: StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const ease = gsap.parseEase("power2.out");

// The change against the previous period: "▲ 12 %", and whether that way is good. Against zero there is no
// percentage, so the change is in units.
export function kpiDelta(value: number, previous: number, better: "up" | "down" = "up"): { text: string; good: boolean } {
  const d = value - previous;
  const arrow = d > 0 ? "▲" : d < 0 ? "▼" : "±";
  const size = previous === 0 ? `${d3.format(",~f")(Math.abs(d))}` : `${Math.round(Math.abs(d / previous) * 100)} %`;
  return { text: `${arrow} ${size}`, good: d === 0 || (d > 0) === (better === "up") };
}

// A waffle's filled cells out of 100: one per percent of the whole.
export const waffleCells = (value: number, of: number): number => Math.max(0, Math.min(100, Math.round((value / of) * 100)));

const decimals = (n: number) => (String(n).split(".")[1] ?? "").length;
const el = <K extends keyof HTMLElementTagNameMap>(parent: Element, tag: K, css: Partial<CSSStyleDeclaration>, text = "") => {
  const e = parent.appendChild(document.createElement(tag));
  Object.assign(e.style, css);
  e.textContent = text;
  return e;
};
const svgEl = (parent: Element, tag: string, attrs: Record<string, string | number>) => {
  const e = parent.appendChild(document.createElementNS(SVG, tag)) as SVGElement;
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  return e;
};

// The block every stat sits in: absolute at (x, y), hidden, its source in data-k-note for the speaker view.
function block(ctx: Ctx, kind: string, x: number, y: number, w: number, source?: string): HTMLElement {
  const root = el(ctx.html, "div", { position: "absolute", left: `${x}px`, top: `${y}px`, width: `${w}px`, color: "var(--k-fg)", font: "600 28px/1.25 var(--k-font)" });
  root.setAttribute(`data-k-${kind}`, "");
  root.dataset.kNote = `${t("source", ctx.deck.lang)}: ${source || t("originNotStated", ctx.deck.lang)}`;
  gsap.set(root, { autoAlpha: 0 });
  return root;
}

// A number that counts up from 0 as a pure function of the tween's progress.
function counting(tl: gsap.core.Timeline, node: HTMLElement, to: number, show: (n: number) => string) {
  node.setAttribute("data-k-text", "");
  node.textContent = show(0);
  tl.to({}, {
    duration: motion.step * 2,
    onUpdate(this: gsap.core.Tween) {
      node.textContent = show(to * ease(this.progress()));
    },
  }, "<");
}

// A KPI tile: the label, the number (counting up), the change against last period in --k-ok or --k-bad, and a
// sparkline of the recent values that draws on, its last point in --k-accent.
export function kpi(ctx: Ctx, opts: KpiOpts): StatHandle {
  const w = opts.w ?? 480;
  const root = block(ctx, "kpi", opts.x, opts.y, w, opts.source);
  Object.assign(root.style, { boxSizing: "border-box", padding: "28px 32px", borderRadius: "16px", background: "var(--k-surface)", border: "2px solid var(--k-line)" });
  el(root, "div", { color: "var(--k-muted)" }, opts.label);
  const fmt = d3.format(`,.${decimals(opts.value)}f`);
  // The number and its unit on one line; the unit at about a third of the number's size.
  const line0 = el(root, "div", { whiteSpace: "nowrap", margin: "8px 0" });
  const num = el(line0, "span", { font: "700 112px/1.1 var(--k-font)", fontVariantNumeric: "tabular-nums" });
  if (opts.unit) el(line0, "span", { font: "600 40px/1 var(--k-font)", marginLeft: "8px" }, opts.unit.trim());
  let badge: HTMLElement | undefined;
  if (opts.previous !== undefined) {
    const d = kpiDelta(opts.value, opts.previous, opts.better);
    badge = el(root, "div", { color: d.good ? "var(--k-ok)" : "var(--k-bad)" }, d.text);
    badge.dataset.good = String(d.good);
  }
  let line: SVGElement | undefined;
  let dot: SVGElement | undefined;
  if (opts.spark && opts.spark.length > 1) {
    const [sw, sh] = [w - 64, 96];
    const svg = svgEl(el(root, "div", { marginTop: "20px" }), "svg", { width: sw, height: sh, viewBox: `0 0 ${sw} ${sh}` });
    // 12 units in from every edge, so the end dot (r 8) is never clipped.
    const x = d3.scaleLinear().domain([0, opts.spark.length - 1]).range([12, sw - 12]);
    const y = d3.scaleLinear().domain(d3.extent(opts.spark) as [number, number]).range([sh - 12, 12]);
    line = svgEl(svg, "path", { d: d3.line<number>((_, i) => x(i), (v) => y(v))(opts.spark) ?? "", fill: "none", "stroke-width": 4, "stroke-linejoin": "round", "stroke-linecap": "round", pathLength: 1 });
    Object.assign(line.style, { stroke: "var(--k-line)", strokeDasharray: "1 2" });
    const last = opts.spark.length - 1;
    dot = svgEl(svg, "circle", { cx: x(last), cy: y(opts.spark[last]), r: 8 });
    dot.style.fill = "var(--k-accent)";
    gsap.set(line, { strokeDashoffset: 1, autoRound: false });
    gsap.set(dot, { scale: 0, transformOrigin: "50% 50%" });
  }
  if (badge) gsap.set(badge, { autoAlpha: 0 });
  num.textContent = fmt(0);
  return {
    show(tl) {
      tl.to(root, { autoAlpha: 1, duration: motion.step });
      counting(tl, num, opts.value, fmt);
      if (line) tl.to(line, { strokeDashoffset: 0, duration: motion.step * 2, ease: "power1.inOut", autoRound: false }, "<");
      if (dot) tl.to(dot, { scale: 1, duration: motion.step / 2 }, ">");
      if (badge) tl.to(badge, { autoAlpha: 1, duration: motion.step }, "<");
    },
  };
}

// A share as a 10x10 grid: one cell per percent of the whole fills in --k-accent, row by row from the top
// left; the rest stay --k-line. The number counts up beside the label under it.
export function waffle(ctx: Ctx, opts: WaffleOpts): StatHandle {
  const of = opts.of ?? 100;
  const root = block(ctx, "waffle", opts.x, opts.y, opts.size, opts.source);
  const gap = opts.size / 60;
  const cell = (opts.size - 9 * gap) / 10;
  const svg = svgEl(root, "svg", { width: opts.size, height: opts.size, viewBox: `0 0 ${opts.size} ${opts.size}` });
  const n = waffleCells(opts.value, of);
  const on: SVGElement[] = [];
  for (let i = 0; i < 100; i++) {
    const r = svgEl(svg, "rect", { x: (i % 10) * (cell + gap), y: Math.floor(i / 10) * (cell + gap), width: cell, height: cell, rx: cell / 6 });
    r.style.fill = "var(--k-line)";
    if (i < n) {
      const lit = svgEl(svg, "rect", { x: (i % 10) * (cell + gap), y: Math.floor(i / 10) * (cell + gap), width: cell, height: cell, rx: cell / 6 });
      lit.style.fill = "var(--k-accent)";
      on.push(lit);
    }
  }
  gsap.set(on, { autoAlpha: 0 });
  const text = el(root, "div", { marginTop: "20px", display: "flex", gap: "16px", alignItems: "baseline" });
  const num = el(text, "span", { font: "700 64px/1 var(--k-font)", color: "var(--k-accent)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", flexShrink: "0" });
  if (opts.label) el(text, "span", {}, opts.label);
  const show = (v: number) => `${Math.round(v)} %`;
  num.textContent = show(0);
  return {
    show(tl) {
      tl.to(root, { autoAlpha: 1, duration: motion.step });
      // The cells fill over the same 1.2 s whatever their number.
      if (on.length) tl.to(on, { autoAlpha: 1, duration: 0.15, stagger: 1.05 / on.length }, ">");
      counting(tl, num, (opts.value / of) * 100, show);
    },
  };
}

// Progress to a target as a ring: the arc fills in --k-accent up to value / target (a full ring at or past
// it, then --k-ok), the share counts up in the centre, and "of <target>" sits under it.
export function progress(ctx: Ctx, opts: ProgressOpts): StatHandle {
  const root = block(ctx, "progress", opts.x, opts.y, opts.size, opts.source);
  const s = opts.size;
  const thick = s * 0.1;
  const box = el(root, "div", { position: "relative", width: `${s}px`, height: `${s}px` });
  const svg = svgEl(box, "svg", { width: s, height: s, viewBox: `0 0 ${s} ${s}` });
  const ring = { cx: s / 2, cy: s / 2, r: s / 2 - thick / 2, fill: "none", "stroke-width": thick };
  svgEl(svg, "circle", ring).style.stroke = "var(--k-line)";
  const frac = Math.max(0, Math.min(1, opts.value / opts.target));
  const arc = svgEl(svg, "circle", { ...ring, pathLength: 1, "stroke-linecap": "round", transform: `rotate(-90 ${s / 2} ${s / 2})` });
  Object.assign(arc.style, { stroke: frac >= 1 ? "var(--k-ok)" : "var(--k-accent)", strokeDasharray: `${frac} 1` });
  gsap.set(arc, { strokeDashoffset: frac, autoRound: false });
  const mid = el(box, "div", { position: "absolute", inset: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" });
  const num = el(mid, "div", { font: `700 ${Math.round(s * 0.2)}px/1 var(--k-font)`, fontVariantNumeric: "tabular-nums" });
  const fmt = d3.format(`,.${decimals(opts.target)}f`);
  el(mid, "div", { color: "var(--k-muted)", fontSize: `${Math.max(24, Math.round(s * 0.07))}px`, marginTop: "8px" }, `${t("of", ctx.deck.lang)} ${fmt(opts.target)}`);
  if (opts.label) el(root, "div", { marginTop: "20px", textAlign: "center" }, opts.label);
  const show = (v: number) => `${Math.round(v)} %`;
  num.textContent = show(0);
  return {
    show(tl) {
      tl.to(root, { autoAlpha: 1, duration: motion.step });
      tl.to(arc, { strokeDashoffset: 0, duration: motion.step * 2, ease: "power2.out", autoRound: false }, ">");
      counting(tl, num, (opts.value / opts.target) * 100, show);
    },
  };
}

export interface GaugeOpts {
  x: number;
  y: number;
  size: number; // the dial's width; it is about half as high, plus the number under it
  value: number;
  min?: number; // default 0
  max: number;
  label?: string;
  unit?: string; // after the number, smaller
  source?: string;
}
export interface GaugeHandle {
  show: StepAdder; // fades in; the needle swings from min to value
  to(value: number): StepAdder; // the needle swings on from where the steps before left it
}

// The needle's angle in degrees from straight up: -90 at min, 90 at max, clamped to the dial.
export const gaugeAngle = (value: number, min: number, max: number): number =>
  -90 + 180 * Math.max(0, Math.min(1, (value - min) / (max - min)));

// A half-circle dial: the track in --k-line, the arc up to the value and the needle in --k-accent, the number
// (deck language format) under the dial, min and max at the ends. With reduced motion the needle jumps.
export function gauge(ctx: Ctx, opts: GaugeOpts): GaugeHandle {
  const min = opts.min ?? 0;
  const s = opts.size;
  const thick = s * 0.08;
  const [cx, cy, r] = [s / 2, s / 2, s / 2 - thick / 2];
  const root = block(ctx, "gauge", opts.x, opts.y, s, opts.source);
  const svg = svgEl(root, "svg", { width: s, height: s / 2 + thick, viewBox: `0 0 ${s} ${s / 2 + thick}` });
  const dial = { d: `M${cx - r} ${cy}A${r} ${r} 0 0 1 ${cx + r} ${cy}`, fill: "none", "stroke-width": thick, pathLength: 1 };
  svgEl(svg, "path", dial).style.stroke = "var(--k-line)";
  const arc = svgEl(svg, "path", dial);
  // Dash 1, gap 1: an offset of 1 - f shows the first f of the dial, so a swing is one offset tween.
  Object.assign(arc.style, { stroke: "var(--k-accent)", strokeDasharray: "1 1" });
  const needle = svgEl(svg, "line", { x1: cx, y1: cy, x2: cx, y2: cy - r, "stroke-width": thick * 0.3, "stroke-linecap": "round" });
  needle.style.stroke = "var(--k-accent)";
  svgEl(svg, "circle", { cx, cy, r: thick * 0.5 }).style.fill = "var(--k-accent)";
  const frac = (v: number) => (gaugeAngle(v, min, opts.max) + 90) / 180;
  gsap.set(arc, { strokeDashoffset: 1, autoRound: false });
  gsap.set(needle, { rotation: -90, svgOrigin: `${cx} ${cy}` });
  const lang = ctx.deck.lang;
  const small = `${Math.max(24, Math.round(s * 0.05))}px`;
  const ends = el(root, "div", { display: "flex", justifyContent: "space-between", color: "var(--k-muted)", fontSize: small });
  el(ends, "span", {}, counterText(min, min, 1, lang, decimals(min)));
  el(ends, "span", {}, counterText(opts.max, opts.max, 1, lang, decimals(opts.max)));
  const line0 = el(root, "div", { textAlign: "center", whiteSpace: "nowrap" });
  const num = el(line0, "span", { font: `700 ${Math.round(s * 0.16)}px/1.1 var(--k-font)`, fontVariantNumeric: "tabular-nums" });
  num.setAttribute("data-k-text", "");
  num.textContent = counterText(min, min, 1, lang, decimals(opts.value));
  if (opts.unit) el(line0, "span", { font: `600 ${small}/1 var(--k-font)`, marginLeft: "8px" }, opts.unit.trim());
  if (opts.label) el(root, "div", { marginTop: "12px", textAlign: "center" }, opts.label);

  const swing = (tl: gsap.core.Timeline, from: number, to: number, at?: string) => {
    const d = { duration: ctx.reducedMotion ? 0 : motion.step * 2, ease: "power2.out", immediateRender: false };
    tl.fromTo(needle, { rotation: gaugeAngle(from, min, opts.max) }, { rotation: gaugeAngle(to, min, opts.max), ...d }, at);
    tl.fromTo(arc, { strokeDashoffset: 1 - frac(from) }, { strokeDashoffset: 1 - frac(to), autoRound: false, ...d }, "<");
    const dec = decimals(to);
    tl.to({}, {
      ...d,
      onUpdate(this: gsap.core.Tween) {
        num.textContent = counterText(from, to, this.ratio, lang, dec);
      },
    }, "<");
  };
  let at = min; // the value the steps added so far leave the needle on
  return {
    show(tl) {
      tl.to(root, { autoAlpha: 1, duration: motion.step });
      swing(tl, min, opts.value, ">");
      at = opts.value;
    },
    to: (value) => (tl) => {
      swing(tl, at, value);
      at = value;
    },
  };
}

export interface LikertOpts {
  x: number;
  y: number;
  w: number;
  rows: { statement: string; counts: number[] }[]; // counts: how many gave each of the 5 points, disagree first
  scale?: string[]; // the 5 point names; default "Strongly disagree" … "Strongly agree"
  source?: string;
}
export interface LikertHandle {
  show: StepAdder; // the legend, the statements and their empty tracks
  row(i: number): StepAdder; // row i's answers grow in and its agree share counts up
}

// shortcut: English point names; move them to strings.ts when it has a second language.
const LIKERT_SCALE = ["Strongly disagree", "Disagree", "Neutral", "Agree", "Strongly agree"];
// Diverging: --k-bad for disagree, through --k-line for neutral, to --k-ok for agree.
const LIKERT_FILL = [
  "var(--k-bad)",
  "color-mix(in srgb, var(--k-bad) 50%, var(--k-bg))",
  "var(--k-line)",
  "color-mix(in srgb, var(--k-ok) 50%, var(--k-bg))",
  "var(--k-ok)",
];

// Each point's share of the row's answers, 0 to 1; all 0 for a row nobody answered.
export function likertShares(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  return counts.map((c) => (total > 0 ? c / total : 0));
}

// Survey answers on a 5-point agree scale: one row per statement, its answers as a 100 % bar from disagree
// (left) to agree (right), and the agree share (the top two points) at its end. One person's answer is a row
// with a single count of 1. A row whose counts are not 5 numbers of 0 or more is a deck problem and stays empty.
export function likert(ctx: Ctx, opts: LikertOpts): LikertHandle {
  const root = block(ctx, "likert", opts.x, opts.y, opts.w, opts.source);
  const legend = el(root, "div", { display: "flex", flexWrap: "wrap", gap: "8px 28px", marginBottom: "28px", fontSize: "24px", color: "var(--k-muted)" });
  (opts.scale ?? LIKERT_SCALE).forEach((name, i) => {
    const item = el(legend, "span", { display: "flex", alignItems: "center", gap: "10px" });
    el(item, "span", { width: "20px", height: "20px", borderRadius: "4px", background: LIKERT_FILL[i] });
    el(item, "span", {}, name);
  });
  const rows = opts.rows.map((row, i) => {
    const ok = row.counts.length === 5 && row.counts.every((c) => Number.isFinite(c) && c >= 0);
    if (!ok) ctx.problem(`likert: row ${i + 1} needs 5 counts of 0 or more, got [${row.counts.join(", ")}]`);
    const shares = ok ? likertShares(row.counts) : [0, 0, 0, 0, 0];
    const line = el(root, "div", { display: "flex", alignItems: "center", gap: "24px", marginBottom: "24px" });
    line.dataset.kLikertRow = String(i);
    el(line, "div", { flex: "0 0 38%" }, row.statement);
    const track = el(line, "div", { flex: "1", height: "44px", borderRadius: "8px", background: "var(--k-surface)", overflow: "hidden" });
    const bar = el(track, "div", { display: "flex", height: "100%" });
    shares.forEach((sh, k) => el(bar, "div", { flex: `${sh} 0 0`, background: LIKERT_FILL[k] }));
    const num = el(line, "div", { flex: "0 0 96px", textAlign: "right", color: "var(--k-ok)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" });
    const show = (v: number) => `${Math.round(v)} %`;
    num.textContent = show(0);
    gsap.set(num, { autoAlpha: 0 });
    // With reduced motion the bar fades in instead of growing.
    gsap.set(bar, ctx.reducedMotion ? { autoAlpha: 0 } : { scaleX: 0, transformOrigin: "0% 50%" });
    return { bar, num, agree: (shares[3] + shares[4]) * 100, show };
  });
  return {
    show(tl) {
      tl.to(root, { autoAlpha: 1, duration: motion.step });
    },
    row: (i) => (tl) => {
      const r = rows[i];
      if (!r) return ctx.problem(`likert: no row ${i}; the rows are 0 to ${rows.length - 1}`);
      tl.to(r.bar, ctx.reducedMotion ? { autoAlpha: 1, duration: motion.step } : { scaleX: 1, duration: motion.step * 2, ease: "power2.out" });
      tl.to(r.num, { autoAlpha: 1, duration: motion.step / 2 }, "<");
      counting(tl, r.num, r.agree, r.show);
    },
  };
}
