import * as d3 from "d3";
import { gsap } from "gsap";
import { t } from "../strings";
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
