import * as d3 from "d3";
import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

// The first column labels the rows; every later column that is a number in all rows is a series.
// bar and waterfall use the first series; stacked and line use all of them;
// timeline reads two series per row: start, then end (for example years).
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
// Lines starting with # are comments, so a data file can say "# source: klappe demo sample".
export function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() && !l.trimStart().startsWith("#"));
  if (!lines.length) return [];
  const head = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((l) => {
    const cells = l.split(",").map((c) => c.trim());
    return Object.fromEntries(
      head.map((h, i) => {
        const v = cells[i] ?? "";
        return [h, v !== "" && Number.isFinite(+v) ? +v : v];
      }),
    );
  });
}

function columns(rows: Row[]) {
  const [label, ...rest] = Object.keys(rows[0] ?? {});
  return { label, series: rest.filter((k) => rows.every((r) => typeof r[k] === "number")) };
}
const num = (r: Row, k: string) => r[k] as number;

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

const PALETTE = ["var(--k-accent)", "var(--k-phosphor)", "var(--k-phosphor-amber)", "var(--k-fg)"];
const FONT = 22; // ≥ 14 px on screen at 1366 (scale 0.71)
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
const decimals = (vs: number[]) => d3.max(vs, (v) => (String(v).split(".")[1] ?? "").length) ?? 0;

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
    border: "4px dashed var(--k-accent)",
    background: "var(--k-bg)",
    color: "var(--k-accent)",
    fontSize: "48px",
    fontWeight: "700",
  });
  ctx.html.append(box);
  gsap.set(box, { autoAlpha: 0 });
  // Every adder shows the box, so any step order shows it.
  const show: StepAdder = (tl) => void tl.to(box, { autoAlpha: 1, duration: motion.step });
  return { axes: show, grow: show, values: show };
}

function load(ctx: Ctx, opts: ChartOpts): Row[] | null | string {
  if (opts.data !== undefined) return opts.data;
  const raw = ctx.files.data[opts.src];
  if (raw === undefined) return null;
  try {
    const rows = opts.src.endsWith(".json") ? JSON.parse(raw) : parseCsv(raw);
    return Array.isArray(rows) ? rows : "not an array of rows";
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
}

export function chart(ctx: Ctx, opts: ChartOpts): ChartHandle {
  const type = opts.type ?? "bar";
  const data = load(ctx, opts);
  if (data === null) return placeholder(ctx, opts, "DATA MISSING", "");
  if (typeof data === "string") return placeholder(ctx, opts, "DATA ERROR", data);
  if (!data.length) return placeholder(ctx, opts, "DATA MISSING", "no rows");
  const { label, series } = columns(data);
  if (series.length < (type === "timeline" ? 2 : 1))
    return placeholder(ctx, opts, "DATA ERROR", type === "timeline" ? "needs a start and an end column" : "no number column");
  const keys = type === "stacked" || type === "line" ? series : [series[0]];
  const names = data.map((r) => String(r[label]));

  const R = opts.rect;
  const legend = keys.length > 1;
  const longest = d3.max(names, (n) => n.length) ?? 0;
  const m = {
    top: 56 + (legend ? 40 : 0) + 40,
    left: type === "timeline" ? Math.min(R.w * 0.3, 24 + longest * 13) : 90,
    right: type === "timeline" ? 130 : 30,
    bottom: 56,
  };
  const P = { x: R.x + m.left, y: R.y + m.top, w: R.w - m.left - m.right, h: R.h - m.top - m.bottom };

  const root = svg(ctx.svg, "g", { "data-k-src": opts.src, "data-k-chart": type });
  const head: SVGElement[] = [];
  if (opts.title) head.push(text(root, opts.title, { x: R.x, y: R.y + 34, "font-weight": 700 }, 32));
  if (opts.sample) {
    const s = text(root, "Sample data", { x: R.x + R.w, y: R.y + 34, "text-anchor": "end" });
    s.style.fill = "var(--k-phosphor-amber)";
    head.push(s);
  }
  if (legend) {
    const g = svg(root, "g", {});
    let lx = R.x;
    keys.forEach((k, i) => {
      svg(g, "rect", { x: lx, y: R.y + 62, width: 18, height: 18 }).style.fill = PALETTE[i % PALETTE.length];
      text(g, k, { x: lx + 26, y: R.y + 79 });
      lx += 26 + k.length * 12 + 32; // about 12 px per character at 22 px
    });
    head.push(g);
  }

  const v = d3.scaleLinear().domain(chartDomain(data, type)).nice();
  const marks = svg(root, "g", {});
  const grown: { el: SVGElement; origin: string; scale: "scaleX" | "scaleY" | "scale"; dur?: number }[] = [];
  const values: { el: SVGTextElement; from: number; to: number; show: (n: number) => string }[] = [];
  const dec = decimals(data.flatMap((r) => keys.map((k) => num(r, k))));
  const fmt = d3.format(`,.${dec}f`);
  const color = (i: number) => PALETTE[i % PALETTE.length];
  const valueAt = (s: string, attrs: Record<string, string | number>, from: number, to: number, show: (n: number) => string) => {
    values.push({ el: text(root, s, attrs), from, to, show });
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
    const y = d3.scaleBand().domain(names).range([P.y, P.y + P.h]).padding(0.35);
    const tdec = decimals(data.flatMap((r) => [num(r, a), num(r, b)]));
    data.forEach((r, i) => {
      const [s, e] = [num(r, a), num(r, b)];
      const rect = svg(marks, "rect", { x: x(s), y: y(names[i])!, width: x(e) - x(s), height: y.bandwidth() });
      rect.style.fill = color(i);
      grown.push({ el: rect, origin: "0% 50%", scale: "scaleX" });
      const yc = y(names[i])! + y.bandwidth() / 2 + FONT * 0.35;
      valueAt("", { x: x(e) + 10, y: yc }, s, e, (n) => `${s.toFixed(tdec)}–${n.toFixed(tdec)}`);
    });
    xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.format("d"));
    yAxis = d3.axisLeft(y).tickSize(0).tickPadding(12);
  } else {
    // Below zero, value labels sit under their bars: keep them clear of the category labels.
    v.range([P.y + P.h - (v.domain()[0] < 0 ? FONT + 16 : 0), P.y]);
    if (type === "line") {
      const x = d3.scalePoint().domain(names).range([P.x, P.x + P.w]).padding(0.5);
      const id = `k-chart-clip-${++clips}`;
      const clip = svg(svg(root, "clipPath", { id }), "rect", { x: R.x, y: R.y, width: R.w, height: R.h });
      grown.push({ el: clip, origin: "0% 50%", scale: "scaleX", dur: motion.step * 2 }); // the line draws left to right
      marks.setAttribute("clip-path", `url(#${id})`);
      keys.forEach((k, i) => {
        const path = svg(marks, "path", {
          d: d3.line<Row>((r) => x(String(r[label]))!, (r) => v(num(r, k)))(data) ?? "",
          fill: "none",
          "stroke-width": 5,
          "stroke-linejoin": "round",
        });
        path.style.stroke = color(i);
        data.forEach((r, j) => {
          const c = svg(root, "circle", { cx: x(names[j])!, cy: v(num(r, k)), r: 8 });
          c.style.fill = color(i);
          grown.push({ el: c, origin: "50% 50%", scale: "scale" });
          valueAt("", { x: x(names[j])!, y: v(num(r, k)) - 16, "text-anchor": "middle" }, 0, num(r, k), fmt);
        });
      });
      xAxis = d3.axisBottom(x).tickSizeOuter(0);
    } else {
      const x = d3.scaleBand().domain(names).range([P.x, P.x + P.w]).padding(0.3);
      const top = (lo: number, hi: number, i: number, to: number, show: (n: number) => string) => {
        const down = hi < lo;
        valueAt("", { x: x(names[i])! + x.bandwidth() / 2, y: down ? v(hi) + FONT + 8 : v(hi) - 10, "text-anchor": "middle" }, 0, to, show);
      };
      if (type === "stacked") {
        const layers = d3.stack<Row>().keys(keys).value((r, k) => num(r, k)).offset(d3.stackOffsetDiverging)(data);
        layers.forEach((layer, li) =>
          layer.forEach(([lo, hi], i) => bar(x(names[i])!, x.bandwidth(), lo, hi, color(li), hi >= lo && lo >= 0)),
        );
        data.forEach((r, i) => {
          const pos = d3.sum(keys, (k) => Math.max(0, num(r, k)));
          top(0, pos, i, d3.sum(keys, (k) => num(r, k)), fmt);
        });
      } else if (type === "waterfall") {
        const signed = d3.format(`+,.${dec}f`);
        waterfallSteps(data.map((r) => num(r, keys[0]))).forEach(([lo, hi], i) => {
          bar(x(names[i])!, x.bandwidth(), lo, hi, hi >= lo ? color(0) : color(2), hi >= lo);
          top(lo, hi, i, hi - lo, signed);
        });
      } else
        data.forEach((r, i) => {
          const n = num(r, keys[0]);
          bar(x(names[i])!, x.bandwidth(), 0, n, color(0), n >= 0);
          top(0, n, i, n, fmt);
        });
      xAxis = d3.axisBottom(x).tickSizeOuter(0);
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
  const axesEls = [axisAt(xAxis, 0, P.y + P.h), axisAt(yAxis, P.x, 0)];
  // A zero line when the value axis crosses zero inside the plot.
  const [lo] = v.domain();
  if (type !== "timeline" && lo < 0) {
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
      tl.to({}, {
        duration: motion.step * 2,
        onUpdate(this: gsap.core.Tween) {
          const p = ease(this.progress());
          for (const { el, from, to, show } of values) el.textContent = show(from + (to - from) * p);
        },
      }, "<");
    },
  };
}
