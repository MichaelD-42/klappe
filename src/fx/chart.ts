import * as d3 from "d3";
import { gsap } from "gsap";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

// The first column labels the rows; every later column with a number in any row is a series, and then
// must be a number in every row (only all-text columns are text). bar, waterfall and donut use the first
// series; stacked and line use all of them; slope the first two (before, after); timeline reads a start and an
// end per row (for example years): the columns named start/from/begin and end/to/until, else the first two.
export type Row = Record<string, string | number>;
export type ChartType = "bar" | "stacked" | "line" | "waterfall" | "timeline" | "donut" | "slope";
export interface ChartOpts {
  src: string; // the data file, as in the Markdown link: "data/x.csv"
  data?: Row[] | null; // null: the file is missing; left out: read src from ctx.files.data
  type?: ChartType; // default bar
  rect: Rect;
  title?: string;
  sample?: boolean;
}
export interface ChartHandle {
  axes: StepAdder;
  grow: StepAdder;
  values: StepAdder;
}

// shortcut: no quoted commas, upgrade to d3-dsv if decks need it
// Lines starting with # are comments. A "# source: <origin>" line before the header says where the
// data comes from; it rides on the returned array as .source.
export function parseCsv(text: string): Row[] & { source?: string } {
  let source: string | undefined;
  const lines: string[] = [];
  for (const l of text.split(/\r?\n/)) {
    const t = l.trim();
    if (!t) continue;
    if (t.startsWith("#")) {
      if (!lines.length) source ??= /^#\s*source:\s*(.*)$/i.exec(t)?.[1].trim();
      continue;
    }
    lines.push(l);
  }
  const head = (lines[0] ?? "").split(",").map((h) => h.trim());
  const rows: Row[] = lines.slice(1).map((l) => {
    const cells = l.split(",").map((c) => c.trim());
    return Object.fromEntries(
      head.map((h, i) => {
        const v = cells[i] ?? "";
        return [h, v !== "" && Number.isFinite(+v) ? +v : v];
      }),
    );
  });
  return source ? Object.assign(rows, { source }) : rows;
}

function columns(rows: Row[]) {
  const [label, ...rest] = Object.keys(rows[0] ?? {});
  return { label, series: rest.filter((k) => rows.some((r) => typeof r[k] === "number")) };
}
const num = (r: Row, k: string) => r[k] as number;
// A timeline's start and end columns: named ones (start/from/begin, end/to/until) win, else the first two.
function span(series: string[]): [string, string] {
  const find = (re: RegExp) => series.find((k) => re.test(k));
  const [s, e] = [find(/^(start|from|begin)$/i), find(/^(end|to|until)$/i)];
  return s && e ? [s, e] : [series[0], series[1]];
}

// Why rows cannot be drawn as this type, or "". Never plot around a bad cell: that would invent numbers.
export function dataError(rows: unknown[], type: ChartType): string {
  const bad = rows.findIndex((r) => !r || typeof r !== "object" || Array.isArray(r));
  if (bad >= 0) return `row ${bad + 1} is not an object`;
  const data = rows as Row[];
  const { series } = columns(data);
  if (type === "timeline" && series.length < 2) return "needs a start and an end column";
  if (type === "slope" && series.length < 2) return "needs a before and an after column";
  if (!series.length) return "no number column";
  for (const [i, r] of data.entries())
    for (const k of series) if (typeof r[k] !== "number") return `row ${i + 1}, column ${k} not a number`;
  if (type === "donut") {
    const k = series[0];
    const i = data.findIndex((r) => num(r, k) < 0);
    if (i >= 0) return `row ${i + 1}, ${k} below zero`;
    if (!(d3.sum(data, (r) => num(r, k)) > 0)) return "the values add up to zero";
    if (data.length > DONUT_MAX) return `${data.length} slices; a donut reads up to ${DONUT_MAX}: merge the small ones into Other`;
  }
  if (type === "timeline") {
    const [a, b] = span(series);
    const i = data.findIndex((r) => num(r, b) < num(r, a));
    if (i >= 0) return `row ${i + 1}, ${b} before ${a}`;
  }
  return "";
}

// A donut stops reading past this many slices; more is a data error that says to merge them.
const DONUT_MAX = 6;

// Each value's slice as fractions of a turn from 12 o'clock, clockwise, in row order.
export function donutSlices(values: number[]): { start: number; end: number; share: number }[] {
  const total = d3.sum(values);
  let at = 0;
  return values.map((v) => {
    const share = v / total;
    return { start: at, end: (at += share), share };
  });
}

// Label positions moved apart until each is at least gap below the one before, in order. A bunch that has to
// move stays centred on where it was; labels already far enough apart stay put.
export function spread(ys: number[], gap: number): number[] {
  const order = ys.map((y, i) => ({ y, i })).sort((a, b) => a.y - b.y);
  // Groups of labels that touch, each placed as a block centred on its members' mean.
  const groups: { ids: number[]; mean: number }[] = [];
  for (const { y, i } of order) {
    groups.push({ ids: [i], mean: y });
    while (groups.length >= 2) {
      const [a, b] = groups.slice(-2);
      const aEnd = a.mean + ((a.ids.length - 1) * gap) / 2;
      const bStart = b.mean - ((b.ids.length - 1) * gap) / 2;
      if (bStart - aEnd >= gap) break;
      const ids = [...a.ids, ...b.ids];
      groups.splice(-2, 2, { ids, mean: d3.mean(ids, (k) => ys[k])! });
    }
  }
  const out = [...ys];
  for (const g of groups) g.ids.forEach((k, j) => (out[k] = g.mean + (j - (g.ids.length - 1) / 2) * gap));
  return out;
}

// Each delta's bar runs from the running total before it to the one after it.
export function waterfallSteps(deltas: number[]): [number, number][] {
  let sum = 0;
  return deltas.map((d) => [sum, (sum += d)]);
}

// The value axis range before nice(): zero is always in it, except for a timeline.
export function chartDomain(rows: Row[], type: ChartType): [number, number] {
  const { series } = columns(rows);
  const [a] = series;
  let vs: number[];
  if (type === "timeline") {
    const [s, e] = span(series);
    return [d3.min(rows, (r) => num(r, s)) ?? 0, d3.max(rows, (r) => num(r, e)) ?? 0];
  }
  // A slope shows change: its axis spans the data, not zero.
  if (type === "slope") {
    const vs = rows.flatMap((r) => [num(r, series[0]), num(r, series[1])]);
    return [Math.min(...vs), Math.max(...vs)];
  }
  if (type === "waterfall") vs = waterfallSteps(rows.map((r) => num(r, a))).flat();
  else if (type === "stacked")
    vs = rows.flatMap((r) => {
      const v = series.map((k) => num(r, k));
      return [d3.sum(v.filter((x) => x > 0)), d3.sum(v.filter((x) => x < 0))];
    });
  else if (type === "line") vs = rows.flatMap((r) => series.map((k) => num(r, k)));
  else vs = rows.map((r) => num(r, a));
  return [Math.min(0, ...vs), Math.max(0, ...vs)];
}

// shortcut: ctx has no deck language, so effect UI words are English; pass meta.lang once ctx has it.
const PALETTE = [1, 2, 3, 4].map((n) => `var(--k-series-${n})`);
const SLICES = [1, 2, 3, 4, 5, 6].map((n) => `var(--k-series-${n})`); // a donut's up to DONUT_MAX slices
const UP = "var(--k-phosphor)";
const DOWN = "color-mix(in srgb, var(--k-fg) 55%, var(--k-bg))";
// Fixed in scene units, so it is ≥ 14 px on screen at 1366 (scale 0.71) whatever the rect's size.
const FONT = 22;
const SVG = "http://www.w3.org/2000/svg";
const ease = gsap.parseEase("power2.out");
let clips = 0;

function svg<K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
}
function text(parent: Element, s: string, attrs: Record<string, string | number>, size = FONT) {
  const t = svg(parent, "text", { "font-size": size, ...attrs });
  t.style.fill = "var(--k-fg)";
  t.textContent = s;
  return t;
}
// The zero line is the only horizontal baseline; the category axis keeps just its labels.
// Its keys are row indices; the ticks show the row names.
const categories = (x: d3.AxisScale<string>, names: string[]) =>
  d3.axisBottom(x).tickSize(0).tickPadding(12).tickFormat((k) => names[+k]);
const decimals =(vs: number[]) => d3.max(vs, (v) => (String(v).split(".")[1] ?? "").length) ?? 0;

// The "Sample data" label shows when the deck asks for it or the data carries the demo marker
// "source: klappe demo sample". Only that marker: a real source may contain the word "sample".
export const showsSample = (sample: boolean | undefined, source: string | undefined): boolean =>
  !!sample || /klappe demo sample/i.test(source ?? "");

// A large visible box instead of the chart, and a deck problem.
function placeholder(ctx: Ctx, opts: ChartOpts, label: string, why: string): ChartHandle {
  ctx.problem(`chart: ${label}: ${opts.src}${why ? ` (${why})` : ""}`);
  const { x, y, w, h } = opts.rect;
  const box = document.createElement("div");
  box.dataset.kSrc = opts.src;
  box.textContent = `${label}: ${opts.src}`;
  Object.assign(box.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: `${w}px`,
    height: `${h}px`,
    boxSizing: "border-box",
    padding: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    overflowWrap: "anywhere",
    border: "4px dashed var(--k-phosphor-amber)",
    background: "var(--k-bg)",
    color: "var(--k-phosphor-amber)",
    fontSize: "48px",
    fontWeight: "700",
  });
  ctx.html.append(box);
  gsap.set(box, { autoAlpha: 0 });
  // Every adder shows the box, so any step order shows it.
  const show: StepAdder = (tl) => void tl.to(box, { autoAlpha: 1, duration: motion.step });
  return { axes: show, grow: show, values: show };
}

// Rows from opts.data or the file: CSV, a JSON array of rows, or JSON { source, rows }.
// null: the file is missing; a string: why the data cannot be read.
function load(ctx: Ctx, opts: ChartOpts): { rows: unknown[]; source?: string } | null | string {
  if (opts.data === null) return null;
  let x: unknown = opts.data;
  if (x === undefined) {
    const raw = ctx.files.data[opts.src];
    if (raw === undefined) return null;
    try {
      x = opts.src.endsWith(".json") ? JSON.parse(raw) : parseCsv(raw);
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }
  const o = x as { rows?: unknown; source?: unknown };
  const rows = Array.isArray(x) ? x : o && typeof o === "object" && Array.isArray(o.rows) ? o.rows : undefined;
  if (!rows) return "not an array of rows";
  return { rows, source: typeof o.source === "string" ? o.source : undefined };
}

export function chart(ctx: Ctx, opts: ChartOpts): ChartHandle {
  const type = opts.type ?? "bar";
  const loaded = load(ctx, opts);
  if (loaded === null) return placeholder(ctx, opts, t("dataMissing", ctx.deck.lang), "");
  if (typeof loaded === "string") return placeholder(ctx, opts, t("dataError", ctx.deck.lang), loaded);
  if (!loaded.rows.length) return placeholder(ctx, opts, t("dataMissing", ctx.deck.lang), "no rows");
  const why = dataError(loaded.rows, type);
  if (why) return placeholder(ctx, opts, t("dataError", ctx.deck.lang), why);
  const data = loaded.rows as Row[];
  const { label, series } = columns(data);
  const keys = type === "stacked" || type === "line" ? series : type === "slope" ? series.slice(0, 2) : [series[0]];
  const names = data.map((r) => String(r[label]));
  if (type === "waterfall") names.push(t("total", ctx.deck.lang));
  // Band keys are row indices, so repeated names (or a data row called "Total") never share a band.
  const band = names.map((_, i) => String(i));
  const color = (i: number) => PALETTE[i % PALETTE.length];
  // Colour means direction in a waterfall and a slope; the legend says which is which.
  const legend =
    type === "waterfall" || type === "slope"
      ? [
          { name: t("increase", ctx.deck.lang), fill: UP },
          { name: t("decrease", ctx.deck.lang), fill: DOWN },
        ]
      : keys.length > 1
        ? keys.map((k, i) => ({ name: k, fill: color(i) }))
        : [];

  const R = opts.rect;
  const longest = d3.max(names, (n) => n.length) ?? 0;
  const dec = decimals(data.flatMap((r) => keys.map((k) => num(r, k))));
  const fmt = d3.format(`,.${dec}f`);
  // A slope's value column: about 13 units per character at FONT.
  const valW = 13 * (d3.max(data.flatMap((r) => keys.map((k) => fmt(num(r, k)).length))) ?? 1);
  const m = {
    top: 56 + (legend.length ? 40 : 0) + 40 + (type === "slope" ? 36 : 0), // a slope's column headers sit above the plot
    left: type === "timeline" ? Math.min(R.w * 0.3, 24 + longest * 13) : type === "slope" ? Math.min(R.w * 0.4, 48 + valW + longest * 13) : 90,
    right: type === "timeline" ? 130 : type === "slope" ? 40 + valW : 30,
    bottom: 56,
  };
  const P = { x: R.x + m.left, y: R.y + m.top, w: R.w - m.left - m.right, h: R.h - m.top - m.bottom };

  // The source goes to the DOM and, through data-k-note, to the speaker view's notes.
  const root = svg(ctx.svg, "g", {
    "data-k-src": opts.src,
    "data-k-chart": type,
    "data-k-note": `${t("source", ctx.deck.lang)}: ${opts.src} — ${loaded.source || t("originNotStated", ctx.deck.lang)}`,
  });
  const head: SVGElement[] = [];
  if (opts.title) head.push(text(root, opts.title, { x: R.x, y: R.y + 34, "font-weight": 700 }, 32));
  if (showsSample(opts.sample, loaded.source)) {
    const s = text(root, t("sampleData", ctx.deck.lang), { x: R.x + R.w, y: R.y + 34, "text-anchor": "end" });
    s.style.fill = "var(--k-phosphor-amber)";
    head.push(s);
  }
  if (legend.length) {
    const g = svg(root, "g", {});
    let lx = R.x;
    for (const { name, fill } of legend) {
      svg(g, "rect", { x: lx, y: R.y + 62, width: 18, height: 18 }).style.fill = fill;
      text(g, name, { x: lx + 26, y: R.y + 79 });
      lx += 26 + name.length * 12 + 32; // about 12 px per character at 22 px
    }
    head.push(g);
  }

  const v = d3.scaleLinear().domain(chartDomain(data, type)).nice();
  const marks = svg(root, "g", {});
  const grown: { el: SVGElement; origin: string; scale: "scaleX" | "scaleY" | "scale"; dur?: number }[] = [];
  const values: { el: SVGTextElement; from: number; to: number; show: (n: number) => string }[] = [];
  const labels: SVGElement[] = []; // names and headers that show with the axes step
  const sweeps: { el: SVGElement; len: number }[] = []; // donut arcs: drawn round, not scaled
  const valueAt = (attrs: Record<string, string | number>, from: number, to: number, show: (n: number) => string) => {
    const el = text(root, "", attrs);
    // A dark halo keeps the number readable where it crosses a line or a bar.
    Object.assign(el.style, { stroke: "var(--k-bg)", strokeWidth: "6px", strokeLinejoin: "round", paintOrder: "stroke" });
    values.push({ el, from, to, show });
  };
  const bar = (x: number, w: number, lo: number, hi: number, fill: string, up: boolean) => {
    const [y0, y1] = [v(lo), v(hi)];
    const r = svg(marks, "rect", { x, width: w, y: Math.min(y0, y1), height: Math.abs(y0 - y1) });
    r.style.fill = fill;
    grown.push({ el: r, origin: up ? "50% 100%" : "50% 0%", scale: "scaleY" });
  };

  let xAxis: d3.Axis<any> | undefined;
  let yAxis: d3.Axis<any> | undefined;
  if (type === "donut") {
    // The ring on the left with the total in its centre; a legend on the right: name, value and share.
    const k = keys[0];
    const total = d3.sum(data, (r) => num(r, k));
    const d = Math.min(P.h, P.w * 0.45);
    const [cx, cy, thick] = [P.x + d / 2, P.y + P.h / 2, d * 0.18];
    const GAP = data.length > 1 ? 0.004 : 0; // a hairline of background between slices, in turns
    donutSlices(data.map((r) => num(r, k))).forEach((s, i) => {
      const len = Math.max(0.001, s.share - GAP);
      const arc = svg(marks, "circle", {
        cx, cy, r: d / 2 - thick / 2, fill: "none", "stroke-width": thick, pathLength: 1,
        transform: `rotate(${-90 + (s.start + GAP / 2) * 360} ${cx} ${cy})`,
      });
      Object.assign(arc.style, { stroke: SLICES[i], strokeDasharray: `${len} 1` });
      sweeps.push({ el: arc, len });
    });
    valueAt({ x: cx, y: cy + 20, "text-anchor": "middle", "font-size": 64, "font-weight": 700 }, 0, total, fmt);
    labels.push(text(root, t("total", ctx.deck.lang), { x: cx, y: cy + 60, "text-anchor": "middle" }));
    const x0 = P.x + d + 80;
    const rowH = Math.min(72, P.h / data.length);
    data.forEach((r, i) => {
      const y = P.y + P.h / 2 + (i - (data.length - 1) / 2) * rowH;
      const sw = svg(root, "rect", { x: x0, y: y - 16, width: 24, height: 24, rx: 4 });
      sw.style.fill = SLICES[i];
      labels.push(sw, text(root, names[i], { x: x0 + 40, y: y + 4 }));
      // Two columns: the value, then its share of the total.
      const n = num(r, k);
      valueAt({ x: R.x + R.w - 120, y: y + 4, "text-anchor": "end" }, 0, n, fmt);
      valueAt({ x: R.x + R.w, y: y + 4, "text-anchor": "end" }, 0, n, (v) => `${Math.round((v / total) * 100)} %`);
    });
  } else if (type === "slope") {
    // Before on the left, after on the right, one line per row: up in the accent of change, down muted.
    const [a, b] = keys;
    v.range([P.y + P.h, P.y]);
    const [xL, xR] = [P.x, P.x + P.w];
    labels.push(text(root, a, { x: xL, y: P.y - 28, "text-anchor": "middle", "font-weight": 700 }));
    labels.push(text(root, b, { x: xR, y: P.y - 28, "text-anchor": "middle", "font-weight": 700 }));
    const id = `k-chart-clip-${++clips}`;
    const clip = svg(svg(root, "clipPath", { id }), "rect", { x: R.x, y: R.y, width: R.w, height: R.h });
    grown.push({ el: clip, origin: "0% 50%", scale: "scaleX", dur: motion.step * 2 }); // the lines draw left to right
    marks.setAttribute("clip-path", `url(#${id})`);
    const gap = FONT + 8;
    const ys = (k: string) => spread(data.map((r) => v(num(r, k)) + FONT * 0.35), gap);
    const [left, right] = [ys(a), ys(b)];
    data.forEach((r, i) => {
      const [va, vb] = [num(r, a), num(r, b)];
      const fill = vb > va ? UP : DOWN;
      const line = svg(marks, "path", { d: `M${xL} ${v(va)}L${xR} ${v(vb)}`, fill: "none", "stroke-width": 5, "stroke-linecap": "round" });
      line.style.stroke = fill;
      for (const [x, n] of [[xL, va], [xR, vb]]) {
        const c = svg(root, "circle", { cx: x, cy: v(n), r: 8 });
        c.style.fill = fill;
        grown.push({ el: c, origin: "50% 50%", scale: "scale" });
      }
      labels.push(text(root, names[i], { x: xL - 32 - valW, y: left[i], "text-anchor": "end" }));
      valueAt({ x: xL - 20, y: left[i], "text-anchor": "end" }, 0, va, fmt);
      valueAt({ x: xR + 20, y: right[i] }, 0, vb, fmt);
    });
  } else if (type === "timeline") {
    const [a, b] = span(series);
    const x = d3.scaleLinear().domain(v.domain()).range([P.x, P.x + P.w]);
    const y = d3.scaleBand().domain(band).range([P.y, P.y + P.h]).padding(0.35);
    const tdec = decimals(data.flatMap((r) => [num(r, a), num(r, b)]));
    data.forEach((r, i) => {
      const [s, e] = [num(r, a), num(r, b)];
      const top = y(band[i])!;
      const rect = svg(marks, "rect", { x: x(s), y: top, width: x(e) - x(s), height: y.bandwidth() });
      rect.style.fill = color(i);
      grown.push({ el: rect, origin: "0% 50%", scale: "scaleX" });
      const yc = top + y.bandwidth() / 2 + FONT * 0.35;
      valueAt({ x: x(e) + 10, y: yc }, s, e, (n) => `${s.toFixed(tdec)}–${n.toFixed(tdec)}`);
    });
    xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.format("d"));
    yAxis = d3.axisLeft(y).tickSize(0).tickPadding(12).tickFormat((k) => names[+k]);
  } else {
    // Below zero, value labels sit under their bars: keep them clear of the category labels.
    v.range([P.y + P.h - (v.domain()[0] < 0 ? FONT + 16 : 0), P.y]);
    if (type === "line") {
      const x = d3.scalePoint().domain(band).range([P.x, P.x + P.w]).padding(0.5);
      const id = `k-chart-clip-${++clips}`;
      const clip = svg(svg(root, "clipPath", { id }), "rect", { x: R.x, y: R.y, width: R.w, height: R.h });
      grown.push({ el: clip, origin: "0% 50%", scale: "scaleX", dur: motion.step * 2 }); // the line draws left to right
      marks.setAttribute("clip-path", `url(#${id})`);
      keys.forEach((k, i) => {
        const path = svg(marks, "path", {
          d: d3.line<Row>((_, j) => x(band[j])!, (r) => v(num(r, k)))(data) ?? "",
          fill: "none",
          "stroke-width": 5,
          "stroke-linejoin": "round",
        });
        path.style.stroke = color(i);
        data.forEach((r, j) => {
          const [n, cx] = [num(r, k), x(band[j])!];
          const c = svg(root, "circle", { cx, cy: v(n), r: 8 });
          c.style.fill = color(i);
          grown.push({ el: c, origin: "50% 50%", scale: "scale" });
          // Below the marker for a negative value, above it otherwise.
          const y = n < 0 ? v(n) + FONT + 14 : v(n) - 16;
          valueAt({ x: cx, y, "text-anchor": "middle" }, 0, n, fmt);
        });
      });
      xAxis = categories(x, names);
    } else {
      const x = d3.scaleBand().domain(band).range([P.x, P.x + P.w]).padding(0.3);
      const left = (i: number) => x(band[i])!;
      // A value label above the bar's end, or below it when the bar runs down.
      const barValue = (lo: number, hi: number, i: number, to: number, show: (n: number) => string) => {
        const y = hi < lo ? v(hi) + FONT + 8 : v(hi) - 10;
        valueAt({ x: left(i) + x.bandwidth() / 2, y, "text-anchor": "middle" }, 0, to, show);
      };
      if (type === "stacked") {
        const layers = d3.stack<Row>().keys(keys).value((r, k) => num(r, k)).offset(d3.stackOffsetDiverging)(data);
        layers.forEach((layer, li) =>
          layer.forEach(([lo, hi], i) => bar(left(i), x.bandwidth(), lo, hi, color(li), hi >= lo && lo >= 0)),
        );
        // With a part below zero the stack's height is not its sum: say "net".
        data.forEach((r, i) => {
          const net = keys.some((k) => num(r, k) < 0);
          const pos = d3.sum(keys, (k) => Math.max(0, num(r, k)));
          barValue(0, pos, i, d3.sum(keys, (k) => num(r, k)), net ? (n) => `${t("net", ctx.deck.lang)} ${fmt(n)}` : fmt);
        });
      } else if (type === "waterfall") {
        const signed = d3.format(`+,.${dec}f`);
        const steps = waterfallSteps(data.map((r) => num(r, keys[0])));
        steps.forEach(([lo, hi], i) => {
          // The first row is the starting value, not a change.
          bar(left(i), x.bandwidth(), lo, hi, i === 0 ? color(0) : hi >= lo ? UP : DOWN, hi >= lo);
          barValue(lo, hi, i, hi - lo, i === 0 ? fmt : signed);
        });
        const total = steps[steps.length - 1][1];
        bar(left(names.length - 1), x.bandwidth(), 0, total, color(0), total >= 0);
        barValue(0, total, names.length - 1, total, fmt);
      } else
        data.forEach((r, i) => {
          const n = num(r, keys[0]);
          bar(left(i), x.bandwidth(), 0, n, color(0), n >= 0);
          barValue(0, n, i, n, fmt);
        });
      xAxis = categories(x, names);
    }
    yAxis = d3.axisLeft(v).ticks(5).tickSizeOuter(0).tickFormat(d3.format(",~f"));
  }

  const axisAt = (axis: d3.Axis<any>, dx: number, dy: number) => {
    const g = svg(root, "g", { transform: `translate(${dx} ${dy})` });
    d3.select(g).call(axis).attr("font-size", FONT).attr("font-family", null);
    g.style.color = "var(--k-fg)";
    root.insertBefore(g, marks);
    return g;
  };
  const axesEls: SVGElement[] = [...(xAxis ? [axisAt(xAxis, 0, P.y + P.h)] : []), ...(yAxis ? [axisAt(yAxis, P.x, 0)] : []), ...labels];
  if (type !== "timeline" && type !== "donut" && type !== "slope") {
    axesEls[0].querySelector(".domain")?.remove();
    const z = svg(root, "line", { x1: P.x, x2: P.x + P.w, y1: v(0), y2: v(0), "stroke-width": 2 });
    z.style.stroke = "var(--k-fg)";
    axesEls.push(z);
  }

  for (const { el, from, show } of values) el.textContent = show(from);
  for (const e of values) e.el.setAttribute("data-k-text", "");
  gsap.set([...head, ...axesEls, ...values.map((e) => e.el)], { autoAlpha: 0 });
  for (const { el, origin, scale } of grown) gsap.set(el, { [scale]: 0, transformOrigin: origin });
  for (const { el, len } of sweeps) gsap.set(el, { strokeDashoffset: len, autoRound: false });

  return {
    axes(tl) {
      tl.to([...head, ...axesEls], { autoAlpha: 1, duration: motion.step, stagger: 0.1 });
    },
    grow(tl) {
      // Donut arcs draw round one after another, each in a time by its share, a full turn in 1.2 s.
      sweeps.forEach(({ el, len }, i) =>
        tl.to(el, { strokeDashoffset: 0, duration: Math.max(0.15, 1.2 * len), ease: i === sweeps.length - 1 ? "power2.out" : "none", autoRound: false }, i ? ">" : undefined),
      );
      if (!grown.length) return;
      const step = Math.min(0.12, 1 / grown.length);
      grown.forEach(({ el, scale, dur }, i) =>
        tl.to(el, { [scale]: 1, duration: dur ?? motion.step, ease: "power2.out" }, i ? `<${step}` : ">"),
      );
    },
    values(tl) {
      tl.to(values.map((e) => e.el), { autoAlpha: 1, duration: motion.step / 2 });
      // Count up as a pure function of this tween's progress, so play equals seek.
      const count = {
        duration: motion.step * 2,
        onUpdate(this: gsap.core.Tween) {
          const p = ease(this.progress());
          for (const { el, from, to, show } of values) el.textContent = show(from + (to - from) * p);
        },
      };
      tl.to({}, count, "<");
    },
  };
}

// Each contender's place, 0 for the largest, ties in column order. Pure, for tests.
export function raceRanks(values: number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v || a.i - b.i);
  const ranks = new Array<number>(values.length);
  order.forEach(({ i }, r) => (ranks[i] = r));
  return ranks;
}

export interface BarRaceOpts {
  src: string; // one row per period (the first column names it), one number column per contender
  data?: Row[] | null;
  rect: Rect;
  title?: string;
  top?: number; // how many bars show; default 8. The rest wait below the frame.
  sample?: boolean;
}
export interface BarRaceHandle {
  show: StepAdder; // title, axis and the first period's bars
  to(period: number | string): StepAdder; // the bars move to that period: by index, or by its name
  periods: string[];
}

// Ranked bars that reorder from one period to the next. The value axis is fixed over all periods, so a bar's
// length compares across time. The period sits large in the corner; numeric periods (years) count.
export function barRace(ctx: Ctx, opts: BarRaceOpts): BarRaceHandle {
  const fail = (h: ChartHandle): BarRaceHandle => ({ show: h.axes, to: () => () => {}, periods: [] });
  const asChart = { ...opts, type: "bar" as const };
  const loaded = load(ctx, asChart);
  if (loaded === null) return fail(placeholder(ctx, asChart, t("dataMissing", ctx.deck.lang), ""));
  if (typeof loaded === "string") return fail(placeholder(ctx, asChart, t("dataError", ctx.deck.lang), loaded));
  if (!loaded.rows.length) return fail(placeholder(ctx, asChart, t("dataMissing", ctx.deck.lang), "no rows"));
  const why = dataError(loaded.rows, "bar") || (columns(loaded.rows as Row[]).series.length < 2 ? "needs two or more contender columns" : "");
  if (why) return fail(placeholder(ctx, asChart, t("dataError", ctx.deck.lang), why));
  const data = loaded.rows as Row[];
  const { label, series } = columns(data);
  const periods = data.map((r) => String(r[label]));
  const top = Math.min(opts.top ?? 8, series.length);
  const R = opts.rect;
  const longest = d3.max(series, (s) => s.length) ?? 0;
  const P = { x: R.x + Math.min(R.w * 0.3, 24 + longest * 13), y: R.y + 120, w: 0, h: R.h - 120 - 24 };
  P.w = R.x + R.w - 140 - P.x; // room for the value after the longest bar
  const slot = P.h / top;
  const x = d3.scaleLinear().domain([0, d3.max(data, (r) => d3.max(series, (k) => num(r, k)))!]).nice().range([0, P.w]);
  const dec = decimals(data.flatMap((r) => series.map((k) => num(r, k))));
  const fmt = d3.format(`,.${dec}f`);
  const numeric = periods.every((p) => Number.isFinite(+p));

  const root = svg(ctx.svg, "g", {
    "data-k-src": opts.src,
    "data-k-chart": "race",
    "data-k-note": `${t("source", ctx.deck.lang)}: ${opts.src} — ${loaded.source || t("originNotStated", ctx.deck.lang)}`,
  });
  const head: SVGElement[] = [];
  if (opts.title) head.push(text(root, opts.title, { x: R.x, y: R.y + 34, "font-weight": 700 }, 32));
  if (showsSample(opts.sample, loaded.source)) {
    const s = text(root, t("sampleData", ctx.deck.lang), { x: R.x + R.w, y: R.y + 34, "text-anchor": "end" });
    s.style.fill = "var(--k-phosphor-amber)";
    head.push(s);
  }
  const axis = svg(root, "g", { transform: `translate(${P.x} ${P.y - 12})` });
  d3.select(axis).call(d3.axisTop(x).ticks(5).tickSizeOuter(0).tickFormat(d3.format(",~f"))).attr("font-size", FONT).attr("font-family", null);
  axis.style.color = "var(--k-fg)";
  head.push(axis);
  const period = text(root, "", { x: R.x + R.w, y: R.y + R.h - 24, "text-anchor": "end", "font-weight": 700 }, 96);
  period.style.fill = "var(--k-muted)";
  period.setAttribute("data-k-text", "");
  period.textContent = periods[0];
  head.push(period);

  // One bar per contender: a group moved up and down by its rank, its rect and value sized by its value.
  const h = slot * 0.72;
  const bars = series.map((k, i) => {
    const g = svg(root, "g", { "data-k-contender": k });
    const rect = svg(g, "rect", { x: P.x, y: (slot - h) / 2, width: 0, height: h, rx: 4 });
    rect.style.fill = SLICES[i % SLICES.length];
    text(g, k, { x: P.x - 14, y: slot / 2 + FONT * 0.35, "text-anchor": "end" });
    const value = text(g, "", { x: P.x + 10, y: slot / 2 + FONT * 0.35 });
    value.setAttribute("data-k-text", "");
    return { g, rect, value };
  });
  // A contender's pose in period p: its row (below the frame and hidden past top), its bar and value.
  const pose = (p: number) => {
    const ranks = raceRanks(series.map((k) => num(data[p], k)));
    return series.map((k, i) => ({ y: P.y + Math.min(ranks[i], top) * slot, alpha: ranks[i] < top ? 1 : 0, v: num(data[p], k) }));
  };
  const place = (p: number) =>
    pose(p).forEach(({ y, alpha, v }, i) => {
      gsap.set(bars[i].g, { y, autoAlpha: alpha });
      bars[i].rect.setAttribute("width", String(x(v)));
      bars[i].value.setAttribute("x", String(P.x + x(v) + 10));
      bars[i].value.textContent = fmt(v);
    });
  place(0);
  gsap.set([...head, ...bars.map((b) => b.g)], { autoAlpha: 0 });

  let at = 0; // the period the steps added so far end on
  const index = (p: number | string) => (typeof p === "number" ? p : periods.indexOf(p));
  return {
    periods,
    show(tl) {
      tl.to(head, { autoAlpha: 1, duration: motion.step, stagger: 0.1 });
      const first = pose(0);
      // The first period's bars fade in where they stand.
      tl.fromTo(bars.map((b) => b.g), { autoAlpha: 0 }, { autoAlpha: (i: number) => first[i].alpha, duration: motion.step, immediateRender: false }, "<");
    },
    to: (p) => (tl) => {
      const to = index(p);
      if (!(to >= 0 && to < periods.length)) return ctx.problem(`barRace: no period ${JSON.stringify(p)}; the periods are ${periods.join(", ")}`);
      const [a, b] = [pose(at), pose(to)];
      const [from, d] = [at, { duration: motion.step * 2, ease: "power1.inOut", immediateRender: false }];
      bars.forEach((bar, i) => {
        tl.fromTo(bar.g, { y: a[i].y, autoAlpha: a[i].alpha }, { y: b[i].y, autoAlpha: b[i].alpha, ...d }, i ? "<" : undefined);
        tl.fromTo(bar.rect, { attr: { width: x(a[i].v) } }, { attr: { width: x(b[i].v) }, ...d }, "<");
        tl.fromTo(bar.value, { attr: { x: P.x + x(a[i].v) + 10 } }, { attr: { x: P.x + x(b[i].v) + 10 }, ...d }, "<");
      });
      // The values and the period count as a pure function of progress; a named period switches halfway.
      tl.to({}, {
        duration: d.duration,
        ease: d.ease,
        onUpdate(this: gsap.core.Tween) {
          const q = this.ratio;
          bars.forEach((bar, i) => (bar.value.textContent = fmt(a[i].v + (b[i].v - a[i].v) * q)));
          period.textContent = numeric ? String(Math.round(+periods[from] + (+periods[to] - +periods[from]) * q)) : periods[q < 0.5 ? from : to];
        },
      }, "<");
      at = to;
    },
  };
}
