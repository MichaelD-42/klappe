import * as d3 from "d3";
import { gsap } from "gsap";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

// The first column labels the rows; every later column with a number in any row is a series, and then
// must be a number in every row (only all-text columns are text). bar and waterfall use the first series;
// stacked and line use all of them; timeline reads two series per row: start, then end (for example years).
export type Row = Record<string, string | number>;
export type ChartType = "bar" | "stacked" | "line" | "waterfall" | "timeline";
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

// Why rows cannot be drawn as this type, or "". Never plot around a bad cell: that would invent numbers.
export function dataError(rows: unknown[], type: ChartType): string {
  const bad = rows.findIndex((r) => !r || typeof r !== "object" || Array.isArray(r));
  if (bad >= 0) return `row ${bad + 1} is not an object`;
  const data = rows as Row[];
  const { series } = columns(data);
  if (type === "timeline" && series.length < 2) return "needs a start and an end column";
  if (!series.length) return "no number column";
  for (const [i, r] of data.entries())
    for (const k of series) if (typeof r[k] !== "number") return `row ${i + 1}, column ${k} not a number`;
  if (type === "timeline") {
    const [a, b] = series;
    const i = data.findIndex((r) => num(r, b) < num(r, a));
    if (i >= 0) return `row ${i + 1}, ${b} before ${a}`;
  }
  return "";
}

// Each delta's bar runs from the running total before it to the one after it.
export function waterfallSteps(deltas: number[]): [number, number][] {
  let sum = 0;
  return deltas.map((d) => [sum, (sum += d)]);
}

// The value axis range before nice(): zero is always in it, except for a timeline.
export function chartDomain(rows: Row[], type: ChartType): [number, number] {
  const { series } = columns(rows);
  const [a, b] = series;
  let vs: number[];
  if (type === "timeline") return [d3.min(rows, (r) => num(r, a)) ?? 0, d3.max(rows, (r) => num(r, b)) ?? 0];
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
const LANG = "en";
const PALETTE = [1, 2, 3, 4].map((n) => `var(--k-series-${n})`);
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
  if (loaded === null) return placeholder(ctx, opts, t("dataMissing", LANG), "");
  if (typeof loaded === "string") return placeholder(ctx, opts, t("dataError", LANG), loaded);
  if (!loaded.rows.length) return placeholder(ctx, opts, t("dataMissing", LANG), "no rows");
  const why = dataError(loaded.rows, type);
  if (why) return placeholder(ctx, opts, t("dataError", LANG), why);
  const data = loaded.rows as Row[];
  const { label, series } = columns(data);
  const keys = type === "stacked" || type === "line" ? series : [series[0]];
  const names = data.map((r) => String(r[label]));
  if (type === "waterfall") names.push(t("total", LANG));
  // Band keys are row indices, so repeated names (or a data row called "Total") never share a band.
  const band = names.map((_, i) => String(i));
  const color = (i: number) => PALETTE[i % PALETTE.length];
  const legend =
    type === "waterfall"
      ? [
          { name: t("increase", LANG), fill: UP },
          { name: t("decrease", LANG), fill: DOWN },
        ]
      : keys.length > 1
        ? keys.map((k, i) => ({ name: k, fill: color(i) }))
        : [];

  const R = opts.rect;
  const longest = d3.max(names, (n) => n.length) ?? 0;
  const m = {
    top: 56 + (legend.length ? 40 : 0) + 40,
    left: type === "timeline" ? Math.min(R.w * 0.3, 24 + longest * 13) : 90,
    right: type === "timeline" ? 130 : 30,
    bottom: 56,
  };
  const P = { x: R.x + m.left, y: R.y + m.top, w: R.w - m.left - m.right, h: R.h - m.top - m.bottom };

  // The source goes to the DOM and, through data-k-note, to the speaker view's notes.
  const root = svg(ctx.svg, "g", {
    "data-k-src": opts.src,
    "data-k-chart": type,
    "data-k-note": `${t("source", LANG)}: ${opts.src} — ${loaded.source || t("originNotStated", LANG)}`,
  });
  const head: SVGElement[] = [];
  if (opts.title) head.push(text(root, opts.title, { x: R.x, y: R.y + 34, "font-weight": 700 }, 32));
  if (showsSample(opts.sample, loaded.source)) {
    const s = text(root, t("sampleData", LANG), { x: R.x + R.w, y: R.y + 34, "text-anchor": "end" });
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
  const dec = decimals(data.flatMap((r) => keys.map((k) => num(r, k))));
  const fmt = d3.format(`,.${dec}f`);
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

  let xAxis: d3.Axis<any>;
  let yAxis: d3.Axis<any>;
  if (type === "timeline") {
    const [a, b] = series;
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
          barValue(0, pos, i, d3.sum(keys, (k) => num(r, k)), net ? (n) => `${t("net", LANG)} ${fmt(n)}` : fmt);
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
  const axesEls: SVGElement[] = [axisAt(xAxis, 0, P.y + P.h), axisAt(yAxis, P.x, 0)];
  if (type !== "timeline") {
    axesEls[0].querySelector(".domain")?.remove();
    const z = svg(root, "line", { x1: P.x, x2: P.x + P.w, y1: v(0), y2: v(0), "stroke-width": 2 });
    z.style.stroke = "var(--k-fg)";
    axesEls.push(z);
  }

  for (const { el, from, show } of values) el.textContent = show(from);
  for (const e of values) e.el.setAttribute("data-k-text", "");
  gsap.set([...head, ...axesEls, ...values.map((e) => e.el)], { autoAlpha: 0 });
  for (const { el, origin, scale } of grown) gsap.set(el, { [scale]: 0, transformOrigin: origin });

  return {
    axes(tl) {
      tl.to([...head, ...axesEls], { autoAlpha: 1, duration: motion.step, stagger: 0.1 });
    },
    grow(tl) {
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
