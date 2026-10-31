import * as d3 from "d3";
import { gsap } from "gsap";
import { t } from "../strings";
import { contrast, motion } from "../theme";
import { token, typeSize } from "./draw";
import { addSource } from "./sources";
import type { Ctx, Rect, StepAdder } from "../types";

// The first column labels the rows; every later column with a number in any row is a series, and then
// must be a number in every row (only all-text columns are text). bar, waterfall and donut use the first
// series; stacked and line use all of them; slope the first two (before, after); timeline reads a start and an
// end per row (for example years): the columns named start/from/begin and end/to/until, else the first two.
// funnel uses the first series as stages; sankey reads its columns by position: source, target, value.
// scatter and bubble use the first two (x, y) and three (x, y, size) series; a column named period, year, date,
// month, quarter or week is not a series but the time, one row per name and period (see scatterTracks).
// radar: rows are dimensions round the circle, one or two series; heatmap: rows by number columns, one cell each;
// treemap: the first series as tiles, and a second text column, if any, as the tile names under the first (groups).
export type Row = Record<string, string | number>;
export type ChartType =
  | "bar" | "stacked" | "line" | "waterfall" | "timeline" | "donut" | "slope" | "funnel" | "sankey" | "scatter" | "bubble"
  | "radar" | "heatmap" | "treemap";
export interface ChartOpts {
  src: string; // the data file, as in the Markdown link: "data/x.csv"
  data?: Row[] | null; // null: the file is missing; left out: read src from ctx.files.data
  type?: ChartType; // default bar
  rect: Rect;
  title?: string;
  sample?: boolean;
  // Bar, stacked, line, waterfall, slope and timeline: dashed lines across the plot at these values (a goal,
  // last year), each with its label; they show with the axes, and the value axis reaches them.
  lines?: { value: number; label: string }[];
  // Scatter and bubble: the text column that colours each dot, one colour per value, with a legend.
  group?: string;
  // Bar and donut: the number columns the chart moves through, the first shown by grow, the others by to(name).
  // The value axis spans them all; the shown column's name stands in the legend row.
  columns?: string[];
}
export interface ChartHandle {
  axes: StepAdder;
  grow: StepAdder;
  values: StepAdder;
  // Bar, waterfall, stacked, timeline and funnel: bar i (a stack, a phase, a stage) grows and its values count up.
  // One per step, instead of grow and values.
  bar(i: number): StepAdder;
  // Donut only: slice i draws round, its legend values count up and the total counts on to the slices so far.
  slice(i: number): StepAdder;
  // Line and radar: series i (0 is the first number column) draws with its markers and values.
  series(i: number): StepAdder;
  // Heatmap only: an outline in --k-accent moves to the cell in row `row`, column `col` (0 is the first number
  // column); null hides it.
  cell(row: number | null, col?: number): StepAdder;
  // The bar rects in data order: waterfall then its total, stacked series by series, funnel stages, sankey nodes
  // in sankeyLayout order; none for a line or a placeholder.
  bars: SVGElement[];
  // A sankey: the flow in that data row turns --k-accent. Any other type: row i (a line chart: series i) stays
  // at full strength and the rest dims. The one lit before goes back; null lights none.
  highlight(row: number | null): StepAdder;
  // A scatter or bubble with a period column only: the dots move to that period, by index or by its name.
  period(p: number | string): StepAdder;
  // Bar and donut with columns: the bars, or the slices, move to that column; the values count there.
  to(column: string): StepAdder;
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
  // The header's order rides along: JS puts keys that look like integers ("2024") first in every row object.
  Object.defineProperty(rows, "columns", { value: head });
  return source ? Object.assign(rows, { source }) : rows;
}

// A table's column names in order: the header's for parsed CSV, else the first row's keys.
export const keysOf = (rows: Row[]) => (rows as { columns?: string[] }).columns ?? Object.keys(rows[0] ?? {});
function columns(rows: Row[]) {
  const [label, ...rest] = keysOf(rows);
  return { label, series: rest.filter((k) => rows.some((r) => typeof r[k] === "number")) };
}
const num = (r: Row, k: string) => r[k] as number;
// A timeline's start and end columns: named ones (start/from/begin, end/to/until) win, else the first two.
function span(series: string[]): [string, string] {
  const find = (re: RegExp) => series.find((k) => re.test(k));
  const [s, e] = [find(/^(start|from|begin)$/i), find(/^(end|to|until)$/i)];
  return s && e ? [s, e] : [series[0], series[1]];
}

const PERIOD = /^(period|year|date|month|quarter|week)$/i;

// A scatter's or bubble's rows as tracks. Without a period column every row is a point (at has one period). With
// one, a point per name (in order of first appearance) and at[p][i] the values of name i in period p, undefined
// where it has no row. keys: the number columns other than the period, in order: x, y, size.
export function scatterTracks(rows: Row[]): { period?: string; periods: string[]; names: string[]; at: number[][][]; keys: string[] } {
  const { label, series } = columns(rows);
  const period = keysOf(rows).slice(1).find((k) => PERIOD.test(k));
  const keys = series.filter((k) => k !== period);
  const vals = (r: Row) => keys.map((k) => num(r, k));
  if (!period) return { period, periods: [], names: rows.map((r) => String(r[label])), at: [rows.map(vals)], keys };
  const periods = [...new Set(rows.map((r) => String(r[period])))];
  const names = [...new Set(rows.map((r) => String(r[label])))];
  const at = periods.map((p) => names.map((n) => rows.find((r) => String(r[period]) === p && String(r[label]) === n)).map((r) => r && vals(r))) as number[][][];
  return { period, periods, names, at, keys };
}

// Why rows cannot be drawn as this type, or "". Never plot around a bad cell: that would invent numbers.
export function dataError(rows: unknown[], type: ChartType): string {
  const bad = rows.findIndex((r) => !r || typeof r !== "object" || Array.isArray(r));
  if (bad >= 0) return `row ${bad + 1} is not an object`;
  const data = rows as Row[];
  // By position, not columns(): a target named "2024" is still a name.
  if (type === "sankey") {
    const [s, tg, k] = keysOf(data);
    if (!k) return "needs source, target and value columns";
    for (const [i, r] of data.entries()) {
      if (r[s] === "" || r[s] === undefined || r[tg] === "" || r[tg] === undefined) return `row ${i + 1}, no source or target`;
      if (typeof r[k] !== "number" || !(r[k] > 0)) return `row ${i + 1}, ${k} not a number above zero`;
    }
    const laid = sankeyLayout(sankeyLinks(data), 0);
    return typeof laid === "string" ? laid : "";
  }
  if (type === "scatter" || type === "bubble") {
    const tr = scatterTracks(data);
    if (tr.keys.length < (type === "bubble" ? 3 : 2)) return type === "bubble" ? "needs an x, a y and a size column" : "needs an x and a y column";
    for (const [i, r] of data.entries()) for (const k of tr.keys) if (typeof r[k] !== "number") return `row ${i + 1}, column ${k} not a number`;
    const size = tr.keys[2];
    const neg = type === "bubble" ? data.findIndex((r) => num(r, size) < 0) : -1;
    if (neg >= 0) return `row ${neg + 1}, ${size} below zero`;
    const { label } = columns(data);
    for (const p of tr.periods)
      for (const n of tr.names) {
        const k = data.filter((r) => String(r[tr.period!]) === p && String(r[label]) === n).length;
        if (k !== 1) return `"${n}" has ${k ? "two rows" : "no row"} for ${tr.period} ${p}`;
      }
    return "";
  }
  const { series } = columns(data);
  if (type === "timeline" && series.length < 2) return "needs a start and an end column";
  if (type === "slope" && series.length < 2) return "needs a before and an after column";
  if (!series.length) return "no number column";
  for (const [i, r] of data.entries())
    for (const k of series) if (typeof r[k] !== "number") return `row ${i + 1}, column ${k} not a number`;
  const below = (k: string) => {
    const i = data.findIndex((r) => num(r, k) < 0);
    return i >= 0 ? `row ${i + 1}, ${k} below zero` : "";
  };
  if (type === "radar") {
    if (data.length < 3) return `${data.length} dimensions; a radar needs at least 3`;
    if (data.length > RADAR_MAX) return `${data.length} dimensions; a radar reads up to ${RADAR_MAX}`;
    if (series.length > 2) return `${series.length} series; a radar reads up to 2`;
    for (const k of series) if (below(k)) return below(k);
  }
  if (type === "heatmap") {
    if (data.length > HEAT_MAX) return `${data.length} rows; a heatmap reads up to ${HEAT_MAX}`;
    if (series.length > HEAT_MAX) return `${series.length} columns; a heatmap reads up to ${HEAT_MAX}`;
  }
  if (type === "treemap") {
    const k = series[0];
    if (below(k)) return below(k);
    if (!(d3.sum(data, (r) => num(r, k)) > 0)) return "the values add up to zero";
    if (data.length > TREEMAP_MAX) return `${data.length} tiles; a treemap reads up to ${TREEMAP_MAX}: merge the small ones into Other`;
  }
  if (type === "donut") {
    const k = series[0];
    const i = data.findIndex((r) => num(r, k) < 0);
    if (i >= 0) return `row ${i + 1}, ${k} below zero`;
    if (!(d3.sum(data, (r) => num(r, k)) > 0)) return "the values add up to zero";
    if (data.length > DONUT_MAX) return `${data.length} slices; a donut reads up to ${DONUT_MAX}: merge the small ones into Other`;
  }
  if (type === "funnel") {
    const k = series[0];
    const i = data.findIndex((r) => num(r, k) < 0);
    if (i >= 0) return `row ${i + 1}, ${k} below zero`;
    if (!(d3.max(data, (r) => num(r, k))! > 0)) return "every stage is zero";
    if (data.length > FUNNEL_MAX) return `${data.length} stages; a funnel reads up to ${FUNNEL_MAX}`;
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
const FUNNEL_MAX = 8;
const RADAR_MAX = 12; // dimensions: past this the names crowd the circle
const HEAT_MAX = 24; // rows and columns: a day by hour fits
const TREEMAP_MAX = 40;
// A sankey's limits: past these its labels no longer fit a slide.
const SANKEY_MAX_NODES = 16;
const SANKEY_MAX_COLUMNS = 6;
const SANKEY_MAX_PER_COLUMN = 8;

// Each stage's width as a share of the largest, and its conversion from the stage before (null for the first
// stage, or when the stage before is zero).
// The ink for a value inside a bar: --k-bg or --k-fg, whichever contrasts more with the bar colour. null when
// neither reaches 4.5:1 (or a colour is not one contrast() reads): the value keeps its --k-bg halo then.
export function barInk(bar: string, bg: string, fg: string): "var(--k-bg)" | "var(--k-fg)" | null {
  try {
    const [b, f] = [contrast(bar, bg), contrast(bar, fg)];
    return Math.max(b, f) < 4.5 ? null : b >= f ? "var(--k-bg)" : "var(--k-fg)";
  } catch {
    return null;
  }
}

// Which of the sankey node colours to use (indices into series): all, less the one nearest the accent when it is
// nearer than 64 in RGB, so a node never reads as a lit flow. Colours in another form than hex or RGB are kept.
export function sankeyPalette(accent: string, series: string[]): number[] {
  const toRgb = (c: string) => (/^(#|rgb)/i.test(c.trim()) ? (gsap.utils.splitColor(c) as number[]) : [NaN, NaN, NaN]);
  const gap = series.map((c) => Math.hypot(...toRgb(accent).slice(0, 3).map((v, i) => v - toRgb(c)[i])));
  const near = gap.indexOf(Math.min(...gap.filter((g) => !Number.isNaN(g))));
  return series.map((_, i) => i).filter((i) => !(i === near && gap[i] < 64));
}

export function funnelLayout(values: number[]): { share: number; conversion: number | null }[] {
  const max = Math.max(...values);
  return values.map((v, i) => ({ share: max > 0 ? v / max : 0, conversion: i && values[i - 1] > 0 ? v / values[i - 1] : null }));
}

export interface SankeyLink {
  source: string;
  target: string;
  value: number;
}
// A sankey's rows as links: the columns by position, source, target, value.
function sankeyLinks(rows: Row[]): SankeyLink[] {
  const [s, tg, k] = keysOf(rows);
  return rows.map((r) => ({ source: String(r[s]), target: String(r[tg]), value: num(r, k) }));
}
export interface SankeyLayout {
  // y0 and y1 in 0..1 of the plot height; depth is the column: the longest path from a node with no inflow.
  nodes: { name: string; depth: number; value: number; y0: number; y1: number }[];
  // In input order: source and target node indices, the band's top at each end (0..1), and its thickness.
  links: { s: number; t: number; value: number; sy: number; ty: number; w: number }[];
  columns: number;
}
// Nodes in columns by depth, in order of first appearance; link bands stacked at each end. The same links always
// give the same layout. gap: the space between nodes in a column, as a share of the height.
// A string says why the links cannot be laid out (a cycle, a self-loop, too many nodes or columns).
export function sankeyLayout(links: SankeyLink[], gap: number): SankeyLayout | string {
  const names: string[] = [];
  const id = (n: string) => (names.includes(n) ? names.indexOf(n) : names.push(n) - 1);
  const L = links.map((l) => ({ s: id(l.source), t: id(l.target), value: l.value }));
  if (names.length > SANKEY_MAX_NODES) return `${names.length} nodes; a sankey reads up to ${SANKEY_MAX_NODES}`;
  const self = L.findIndex((l) => l.s === l.t);
  if (self >= 0) return `row ${self + 1}, ${names[L[self].s]} flows into itself`;
  // Kahn's order: a node never reached sits on a cycle.
  const inflow = names.map((_, i) => L.filter((l) => l.t === i).length);
  const depth = names.map(() => 0);
  const queue = names.map((_, i) => i).filter((i) => !inflow[i]);
  for (let q = 0; q < queue.length; q++)
    for (const l of L.filter((l) => l.s === queue[q])) {
      depth[l.t] = Math.max(depth[l.t], depth[l.s] + 1);
      if (!--inflow[l.t]) queue.push(l.t);
    }
  if (queue.length < names.length) return `a cycle through ${names[inflow.findIndex((n) => n > 0)]}; a sankey flows one way`;
  const columns = Math.max(...depth) + 1;
  if (columns > SANKEY_MAX_COLUMNS) return `${columns} columns; a sankey reads up to ${SANKEY_MAX_COLUMNS}`;
  const value = names.map((_, i) => Math.max(d3.sum(L, (l) => (l.t === i ? l.value : 0)), d3.sum(L, (l) => (l.s === i ? l.value : 0))));
  const cols = d3.range(columns).map((c) => names.map((_, i) => i).filter((i) => depth[i] === c));
  const crowded = cols.findIndex((c) => c.length > SANKEY_MAX_PER_COLUMN);
  if (crowded >= 0) return `${cols[crowded].length} nodes in column ${crowded + 1}; a sankey reads up to ${SANKEY_MAX_PER_COLUMN}`;
  // One scale for every column, so a band is as thick at both ends; each column centred.
  const k = d3.min(cols, (c) => (1 - gap * (c.length - 1)) / d3.sum(c, (i) => value[i]))!;
  const y0 = names.map(() => 0);
  for (const c of cols) {
    let at = (1 - k * d3.sum(c, (i) => value[i]) - gap * (c.length - 1)) / 2;
    for (const i of c) (y0[i] = at), (at += k * value[i] + gap);
  }
  // Bands leave a node in the order of their targets and arrive in the order of their sources: no crossing at a node.
  const out = names.map(() => 0);
  const into = names.map(() => 0);
  const placed = L.map((l) => ({ ...l, sy: 0, ty: 0, w: l.value * k }));
  const by = (key: "s" | "t") => placed.map((l, i) => ({ l, i })).sort((a, b) => y0[a.l[key]] - y0[b.l[key]] || a.i - b.i);
  for (const { l } of by("t")) (l.sy = y0[l.s] + out[l.s]), (out[l.s] += l.w);
  for (const { l } of by("s")) (l.ty = y0[l.t] + into[l.t]), (into[l.t] += l.w);
  const nodes = names.map((name, i) => ({ name, depth: depth[i], value: value[i], y0: y0[i], y1: y0[i] + k * value[i] }));
  return { nodes, links: placed, columns };
}

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

// Scatter names apart: tags whose boxes overlap sideways and sit closer than gap in y move apart (spread), group
// by group, until none touch. x is where a name starts (where it ends, for a left tag), w its width. Pure.
export function tagSpread(tags: { x: number; y: number; w: number; left: boolean }[], gap: number): number[] {
  const ys = tags.map((t) => t.y);
  const span = tags.map((t) => (t.left ? [t.x - t.w, t.x] : [t.x, t.x + t.w]));
  const side = (i: number, j: number) => span[i][0] < span[j][1] && span[j][0] < span[i][1];
  // A group's spread can push a tag onto another group, so go again; a few rounds settle any slide's worth.
  for (let round = 0; round < 10; round++) {
    const root = tags.map((_, i) => i);
    const find = (i: number): number => (root[i] === i ? i : (root[i] = find(root[i])));
    let touching = false;
    for (let i = 0; i < tags.length; i++)
      for (let j = i + 1; j < tags.length; j++)
        if (side(i, j) && Math.abs(ys[i] - ys[j]) < gap - 1e-9) {
          touching = true;
          root[find(i)] = find(j);
        }
    if (!touching) break;
    const groups = d3.group(tags.map((_, i) => i), find);
    for (const ids of groups.values()) {
      if (ids.length < 2) continue;
      const moved = spread(ids.map((i) => ys[i]), gap);
      ids.forEach((i, k) => (ys[i] = moved[k]));
    }
  }
  return ys;
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
const UP = "var(--k-ok)";
const DOWN = "color-mix(in srgb, var(--k-fg) 55%, var(--k-bg))";
// Fixed in scene units, so it is ≥ 14 px on screen at 1366 (scale 0.71) whatever the rect's size.
const FONT = 22;
const charW = () => (13 * typeSize("label", FONT)) / FONT; // about one character at FONT, following the type scale
const DIM = 0.35; // the opacity of the parts highlight() does not light, as focus() dims
const SVG = "http://www.w3.org/2000/svg";
const ease = gsap.parseEase("power2.out");
let clips = 0;

function svg<K extends keyof SVGElementTagNameMap>(parent: Element, tag: K, attrs: Record<string, string | number>) {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
}
function text(parent: Element, s: string, attrs: Record<string, string | number>, size = typeSize("label", FONT)) {
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
    border: "4px dashed var(--k-warn)",
    background: "var(--k-bg)",
    color: "var(--k-warn)",
    fontSize: `${typeSize("body", 48)}px`,
    fontWeight: "700",
  });
  ctx.html.append(box);
  gsap.set(box, { autoAlpha: 0 });
  // Every adder shows the box, so any step order shows it.
  const show: StepAdder = (tl) => void tl.to(box, { autoAlpha: 1, duration: motion.step });
  return { axes: show, grow: show, values: show, bar: () => show, slice: () => show, series: () => show, cell: () => show, bars: [], highlight: () => show, period: () => show, to: () => show };
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
  // The columns to() moves through: only bar and donut, only number columns of the file.
  const cols = opts.columns ?? [];
  if (cols.length && type !== "bar" && type !== "donut") ctx.problem(`chart: columns are for bar and donut charts, not ${type}: ${opts.src}`);
  const badCol = cols.find((c) => !series.includes(c));
  if (badCol !== undefined) ctx.problem(`chart: columns: no number column "${badCol}" in ${opts.src}`);
  const moving = (type === "bar" || type === "donut") && cols.length > 1 && badCol === undefined;
  const keys = moving
    ? [cols[0]]
    :
    type === "scatter" || type === "bubble"
      ? []
      : type === "stacked" || type === "line" || type === "radar" || type === "heatmap"
        ? series
        : type === "slope"
          ? series.slice(0, 2)
          : type === "sankey"
            ? [keysOf(data)[2]]
            : [series[0]];
  // A treemap's second text column: the tile names, under the groups of the first.
  const leaf = type === "treemap" ? keysOf(data).find((k) => k !== label && !series.includes(k)) : undefined;
  const tileGroups = leaf ? [...new Set(data.map((r) => String(r[label])))] : [];
  const names = data.map((r) => String(r[label]));
  if (type === "waterfall") names.push(t("total", ctx.deck.lang));
  // Band keys are row indices, so repeated names (or a data row called "Total") never share a band.
  const band = names.map((_, i) => String(i));
  const color = (i: number) => PALETTE[i % PALETTE.length];
  const dotted = type === "scatter" || type === "bubble";
  if (opts.group !== undefined && !(dotted && opts.group in data[0]))
    ctx.problem(dotted ? `chart: no group column "${opts.group}" in ${opts.src}` : `chart: group is for scatter and bubble charts, not ${type}: ${opts.src}`);
  const groupOf = dotted && opts.group !== undefined && opts.group in data[0] ? (name: string) => String(data.find((r) => String(r[label]) === name)![opts.group!]) : undefined;
  const groups = groupOf ? [...new Set(data.map((r) => String(r[opts.group!])))] : [];
  const groupFill = (name: string) => SLICES[groups.indexOf(groupOf!(name)) % SLICES.length];
  // Colour means direction in a waterfall and a slope; the legend says which is which.
  // A treemap's groups are named on the map: no legend.
  const legend = groups.length
    ? groups.map((g, k) => ({ name: g, fill: SLICES[k % SLICES.length] }))
    : type === "heatmap" || type === "treemap"
      ? []
      : type === "waterfall" || type === "slope"
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
  const valW = charW() * (d3.max(data.flatMap((r) => keys.map((k) => fmt(num(r, k)).length))) ?? 1);
  const m = {
    // A slope's and a heatmap's column headers sit above the plot; a heatmap's ramp is in the legend row.
    top: 56 + (legend.length || type === "heatmap" || moving ? 40 : 0) + 40 + (type === "slope" || type === "heatmap" ? 36 : 0),
    left:
      type === "timeline" || type === "funnel" || type === "heatmap"
        ? Math.min(R.w * 0.3, 24 + longest * charW())
        : type === "slope"
          ? Math.min(R.w * 0.4, 48 + valW + longest * charW())
          : type === "sankey" || type === "radar" || type === "treemap"
            ? 0
            : 90,
    right: type === "timeline" ? 130 : type === "slope" ? 40 + valW : type === "sankey" || type === "radar" || type === "treemap" ? 0 : 30,
    bottom: type === "scatter" || type === "bubble" ? 96 : type === "radar" || type === "treemap" || type === "heatmap" ? 0 : 56, // room for the x axis's name
  };
  const P = { x: R.x + m.left, y: R.y + m.top, w: R.w - m.left - m.right, h: R.h - m.top - m.bottom };

  addSource(ctx, loaded.source);
  // The source goes to the DOM and, through data-k-note, to the speaker view's notes.
  const root = svg(ctx.svg, "g", {
    "data-k-src": opts.src,
    "data-k-chart": type,
    "data-k-note": `${t("source", ctx.deck.lang)}: ${opts.src} — ${loaded.source || t("originNotStated", ctx.deck.lang)}`,
  });
  const head: SVGElement[] = [];
  if (opts.title) head.push(text(root, opts.title, { x: R.x, y: R.y + 34, "font-weight": 700 }, 32));
  if (showsSample(opts.sample, loaded.source)) {
    // Ends at the plot right edge, inside the rect: the right margin keeps it off the frame edge.
    const s = text(root, t("sampleData", ctx.deck.lang), { x: P.x + P.w, y: R.y + 34, "text-anchor": "end" });
    s.style.fill = "var(--k-warn)";
    head.push(s);
  }
  // The shown column's name, in the legend row; to() switches it halfway.
  const colName = moving ? text(root, cols[0], { x: R.x, y: R.y + 79, "font-weight": 700 }) : undefined;
  if (colName) {
    colName.setAttribute("data-k-text", "");
    head.push(colName);
  }
  if (legend.length) {
    const g = svg(root, "g", {});
    let lx = R.x;
    for (const { name, fill } of legend) {
      svg(g, "rect", { x: lx, y: R.y + 62, width: 18, height: 18 }).style.fill = fill;
      text(g, name, { x: lx + 26, y: R.y + 79 });
      lx += 26 + (name.length * 12 * typeSize("label", FONT)) / FONT + 32; // about 12 px per character at 22 px
    }
    head.push(g);
  }

  const REF_TYPES: ChartType[] = ["bar", "stacked", "line", "waterfall", "slope", "timeline"];
  const refs = REF_TYPES.includes(type) ? (opts.lines ?? []) : [];
  if (opts.lines?.length && !refs.length) ctx.problem(`chart: lines are for ${REF_TYPES.join(", ")} charts, not ${type}: ${opts.src}`);
  const later = moving ? data.flatMap((r) => cols.map((c) => num(r, c))) : []; // the axis reaches every column to() shows
  const v = d3.scaleLinear().domain(d3.extent([...chartDomain(data, type), ...refs.map((l) => l.value), ...later]) as [number, number]).nice();
  let refAt: ((n: number) => { x1: number; y1: number; x2: number; y2: number }) | undefined; // where a reference line runs
  const marks = svg(root, "g", {});
  // label: a name that fades in with its mark during grow (a sankey node's)
  // part: the row (a line chart: the series) a mark or value belongs to, for bar(), slice(), series() and
  // highlight(); -1 for what belongs to the whole chart. Marks take the part being built, cur.
  let cur = -1;
  // svgOrigin: a point in the chart's coordinates to scale from, where the element's own box has no such point (a radar shape's centre).
  const grown: { el: SVGElement; origin: string; svgOrigin?: string; scale: "scaleX" | "scaleY" | "scale"; dur?: number; label?: SVGElement; part: number }[] = [];
  const grow = (g: Omit<(typeof grown)[number], "part">) => grown.push({ ...g, part: cur });
  const bars: SVGElement[] = [];
  const values: { el: SVGTextElement; from: number; to: number; show: (n: number) => string; part: number }[] = [];
  const labels: SVGElement[] = []; // names and headers that show with the axes step
  const sweeps: { el: SVGElement; len: number; part: number }[] = []; // donut arcs: drawn round, not scaled
  const strokes: { el: SVGElement; part: number }[] = []; // line and slope paths: they dim with their part
  const valueAt = (attrs: Record<string, string | number>, from: number, to: number, show: (n: number) => string) => {
    const el = text(root, "", attrs);
    // A dark halo keeps the number readable where it crosses a line or a bar.
    Object.assign(el.style, { stroke: "var(--k-bg)", strokeWidth: "6px", strokeLinejoin: "round", paintOrder: "stroke" });
    values.push({ el, from, to, show, part: cur });
    return el;
  };
  const bar = (x: number, w: number, lo: number, hi: number, fill: string, up: boolean) => {
    const [y0, y1] = [v(lo), v(hi)];
    const r = svg(marks, "rect", { x, width: w, y: Math.min(y0, y1), height: Math.abs(y0 - y1) });
    r.style.fill = fill;
    bars.push(r);
    grow({ el: r, origin: up ? "50% 100%" : "50% 0%", scale: "scaleY" });
  };

  let donutTotal = -1; // the index in values of a donut's total, which slice() counts on
  let accents: SVGElement[] = []; // a sankey's links again in --k-accent, hidden until highlight()
  let moveTo: ((p: number | string, tl: gsap.core.Timeline) => void) | undefined; // a scatter's period()
  let cellAt: ((row: number, col: number) => { x: number; y: number }) | undefined; // a heatmap cell's corner, for cell()
  let outline: SVGElement | undefined; // the heatmap's lit-cell outline
  let scatterAxes = false; // a scatter's axes keep their ticks; the frame draws their lines
  let xAxis: d3.Axis<any> | undefined;
  // What to() moves: a plain bar chart's bars and value labels (place: a label's y for a value), a donut's ring.
  const plain: { rect: SVGElement; val: SVGTextElement; place: (n: number) => number }[] = [];
  let ring: { cx: number; cy: number; gap: number; arcs: SVGElement[]; total?: SVGTextElement; vals: SVGTextElement[][] } | undefined;
  let yAxis: d3.Axis<any> | undefined;
  if (type === "donut") {
    // The ring on the left with the total in its centre; a legend on the right: name, value and share.
    const k = keys[0];
    const total = d3.sum(data, (r) => num(r, k));
    const d = Math.min(P.h, P.w * 0.45);
    const [cx, cy, thick] = [P.x + d / 2, P.y + P.h / 2, d * 0.18];
    const GAP = data.length > 1 ? 0.004 : 0; // a hairline of background between slices, in turns
    const shares = donutSlices(data.map((r) => num(r, k)));
    ring = { cx, cy, gap: GAP, arcs: [], vals: [] };
    shares.forEach((s, i) => {
      const len = Math.max(0.001, s.share - GAP);
      const arc = svg(marks, "circle", {
        cx, cy, r: d / 2 - thick / 2, fill: "none", "stroke-width": thick, pathLength: 1,
        transform: `rotate(${-90 + (s.start + GAP / 2) * 360} ${cx} ${cy})`,
      });
      Object.assign(arc.style, { stroke: SLICES[i], strokeDasharray: `${len} 1` });
      sweeps.push({ el: arc, len, part: i });
      ring!.arcs.push(arc);
    });
    donutTotal = values.length;
    ring.total = valueAt({ x: cx, y: cy + 20, "text-anchor": "middle", "font-size": typeSize("title", 64), "font-weight": 700 }, 0, total, fmt);
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
      cur = i;
      ring!.vals.push([
        valueAt({ x: R.x + R.w - 120, y: y + 4, "text-anchor": "end" }, 0, n, fmt),
        valueAt({ x: R.x + R.w, y: y + 4, "text-anchor": "end" }, 0, n, (v) => `${Math.round((v / total) * 100)} %`),
      ]);
      cur = -1;
    });
  } else if (type === "slope") {
    // Before on the left, after on the right, one line per row: up in the accent of change, down muted.
    const [a, b] = keys;
    v.range([P.y + P.h, P.y]);
    const [xL, xR] = [P.x, P.x + P.w];
    refAt = (n) => ({ x1: xL, y1: v(n), x2: xR, y2: v(n) });
    labels.push(text(root, a, { x: xL, y: P.y - 28, "text-anchor": "middle", "font-weight": 700 }));
    labels.push(text(root, b, { x: xR, y: P.y - 28, "text-anchor": "middle", "font-weight": 700 }));
    const id = `k-chart-clip-${++clips}`;
    const clip = svg(svg(root, "clipPath", { id }), "rect", { x: R.x, y: R.y, width: R.w, height: R.h });
    grow({ el: clip, origin: "0% 50%", scale: "scaleX", dur: motion.step * 2 }); // the lines draw left to right
    marks.setAttribute("clip-path", `url(#${id})`);
    const gap = typeSize("label", FONT) + 8;
    const ys = (k: string) => spread(data.map((r) => v(num(r, k)) + typeSize("label", FONT) * 0.35), gap);
    const [left, right] = [ys(a), ys(b)];
    data.forEach((r, i) => {
      const [va, vb] = [num(r, a), num(r, b)];
      const fill = vb > va ? UP : DOWN;
      cur = i;
      const line = svg(marks, "path", { d: `M${xL} ${v(va)}L${xR} ${v(vb)}`, fill: "none", "stroke-width": 5, "stroke-linecap": "round" });
      line.style.stroke = fill;
      strokes.push({ el: line, part: i });
      for (const [x, n] of [[xL, va], [xR, vb]]) {
        const c = svg(root, "circle", { cx: x, cy: v(n), r: 8 });
        c.style.fill = fill;
        grow({ el: c, origin: "50% 50%", scale: "scale" });
      }
      labels.push(text(root, names[i], { x: xL - 32 - valW, y: left[i], "text-anchor": "end" }));
      valueAt({ x: xL - 20, y: left[i], "text-anchor": "end" }, 0, va, fmt);
      valueAt({ x: xR + 20, y: right[i] }, 0, vb, fmt);
      cur = -1;
    });
  } else if (type === "funnel") {
    // One centred bar per stage, width by value; the name left, the value inside the bar's right end when it fits
    // (in the ink that reads on the bar, no halo; with no such ink, --k-fg on its halo), else just right of the bar;
    // the conversion between stages.
    const k = keys[0];
    // Every bar is color(0), --k-series-1: one ink for all.
    const on = barInk(token(ctx.html, "--k-series-1"), token(ctx.html, "--k-bg"), token(ctx.html, "--k-fg"));
    const stages = funnelLayout(data.map((r) => num(r, k)));
    const rowH = P.h / data.length;
    const bh = rowH * 0.62;
    const cx = P.x + P.w / 2;
    data.forEach((r, i) => {
      cur = i;
      const top = P.y + i * rowH + (rowH - bh) / 2;
      const w = Math.max(2, stages[i].share * P.w);
      const rect = svg(marks, "rect", { x: cx - w / 2, y: top, width: w, height: bh, rx: 4 });
      rect.style.fill = color(0);
      bars.push(rect);
      grow({ el: rect, origin: "50% 50%", scale: "scaleX" });
      const yc = top + bh / 2 + typeSize("label", FONT) * 0.35;
      labels.push(text(root, names[i], { x: P.x - 16, y: yc, "text-anchor": "end" }));
      const inside = w >= charW() * fmt(num(r, k)).length + 48; // about 13 px per character at FONT
      const val = valueAt({ x: inside ? cx + w / 2 - 16 : cx + w / 2 + 16, y: yc, "text-anchor": inside ? "end" : "start" }, 0, num(r, k), fmt);
      if (inside) Object.assign(val.style, on ? { fill: on, stroke: "none" } : { strokeWidth: "4px" }); // a thinner halo reads cleaner on a bar
      const c = stages[i].conversion;
      if (i)
        valueAt({ x: cx, y: P.y + i * rowH + typeSize("label", FONT) * 0.35, "text-anchor": "middle" }, 0, (c ?? 0) * 100, (n) =>
          c === null ? "–" : `${Math.round(n)} %`,
        ).style.fill = "var(--k-muted)";
      cur = -1;
    });
  } else if (type === "sankey") {
    // Nodes in columns, bands between them; names and values beside each node, outside the last column inwards.
    const gap = Math.min(typeSize("label", FONT) * 2 + 16, P.h / (2 * SANKEY_MAX_PER_COLUMN));
    const lay = sankeyLayout(sankeyLinks(data), gap / P.h) as SankeyLayout; // dataError has laid it out already
    const NW = 20;
    const palette = sankeyPalette(token(ctx.html, "--k-accent"), SLICES.slice(1).map((v) => token(ctx.html, v.slice(4, -1))));
    const xAt = (d: number) => P.x + (d * (P.w - NW)) / Math.max(1, lay.columns - 1);
    const Y = (f: number) => P.y + f * P.h;
    const id = `k-chart-clip-${++clips}`;
    const clip = svg(svg(root, "clipPath", { id }), "rect", { x: R.x, y: R.y, width: R.w, height: R.h });
    const flows = svg(marks, "g", { "clip-path": `url(#${id})` });
    const band = (l: SankeyLayout["links"][number], fill: string) => {
      const [x0, x1] = [xAt(lay.nodes[l.s].depth) + NW, xAt(lay.nodes[l.t].depth)];
      const [xm, s0, t0, h] = [(x0 + x1) / 2, Y(l.sy), Y(l.ty), l.w * P.h];
      const p = svg(flows, "path", { d: `M${x0} ${s0}C${xm} ${s0} ${xm} ${t0} ${x1} ${t0}V${t0 + h}C${xm} ${t0 + h} ${xm} ${s0 + h} ${x0} ${s0 + h}Z` });
      // A hairline of background keeps bands of one colour apart.
      Object.assign(p.style, { fill, stroke: "var(--k-bg)", strokeWidth: "2px" });
      return p;
    };
    for (const l of lay.links) band(l, "var(--k-line)");
    accents = lay.links.map((l) => band(l, "var(--k-accent)"));
    lay.nodes.forEach((n, i) => {
      const x = xAt(n.depth);
      const rect = svg(marks, "rect", { x, y: Y(n.y0), width: NW, height: Math.max(2, (n.y1 - n.y0) * P.h) });
      rect.style.fill = SLICES[1 + palette[i % palette.length]];
      bars.push(rect);
      const last = n.depth === lay.columns - 1;
      const at = { x: last ? x - 12 : x + NW + 12, "text-anchor": last ? "end" : "start" };
      const yc = Y((n.y0 + n.y1) / 2);
      const name = text(root, n.name, { ...at, y: yc - 4, "font-weight": 700 });
      Object.assign(name.style, { stroke: "var(--k-bg)", strokeWidth: "3px", strokeLinejoin: "round", paintOrder: "stroke" });
      grow({ el: rect, origin: "50% 50%", scale: "scaleY", label: name });
      valueAt({ ...at, y: yc + typeSize("label", FONT) }, 0, n.value, fmt);
    });
    grow({ el: clip, origin: "0% 50%", scale: "scaleX", dur: motion.step * 2 }); // the bands draw left to right
  } else if (type === "scatter" || type === "bubble") {
    // Two value axes and a dot per point, a bubble's area by its size. With a period column the dots start at the
    // first period and period() moves them; the axes span every period, so a place compares across time.
    const tr = scatterTracks(data);
    const all = tr.at.flat();
    const maxR = type === "bubble" ? Math.min(P.w, P.h) * 0.07 : 10;
    const size = d3.scaleSqrt().domain([0, d3.max(all, (q) => q[2]) || 1]).range([0, maxR]);
    const rOf = (q: number[]) => (type === "bubble" ? size(q[2]) : maxR);
    const ext = (k: number): [number, number] => {
      const [a, b] = d3.extent(all, (q) => q[k]) as [number, number];
      return a === b ? [a - 1, b + 1] : [a, b];
    };
    // Inset by the largest dot and a margin, so no dot or name crosses an axis.
    const inset = maxR + 16;
    const x = d3.scaleLinear().domain(ext(0)).nice().range([P.x + inset, P.x + P.w - inset]);
    const y = d3.scaleLinear().domain(ext(1)).nice().range([P.y + P.h - inset, P.y + inset]);
    // One frame for both axes, the full plot's height and width: their own lines stop at the inset ranges.
    const frame = svg(root, "path", { d: `M${P.x} ${P.y}V${P.y + P.h}H${P.x + P.w}`, fill: "none", "stroke-width": 2 });
    frame.style.stroke = "var(--k-line)";
    labels.push(frame);
    const pose = (p: number) => tr.at[p].map((q) => ({ cx: x(q[0]), cy: y(q[1]), r: rOf(q) }));
    labels.push(text(root, tr.keys[0], { x: P.x + P.w, y: P.y + P.h + 84, "text-anchor": "end", "font-weight": 700 }));
    labels.push(text(root, tr.keys[1], { x: P.x - 8, y: P.y - 24, "font-weight": 700 }));
    if (type === "bubble") labels.push(text(root, `${t("size", ctx.deck.lang)}: ${tr.keys[2]}`, { x: P.x + P.w, y: P.y - 24, "text-anchor": "end" }));
    // The period under the plot, left of the x axis's name: inside the plot it could cover a dot.
    const stamp = text(root, tr.periods[0] ?? "", { x: P.x, y: P.y + P.h + 92, "font-weight": 700 }, 56);
    stamp.style.fill = "var(--k-muted)";
    stamp.setAttribute("data-k-text", "");
    if (tr.period) labels.push(stamp);
    // A name sits right of its dot, or left of it where the dot comes near the right edge in any period. Names
    // that would touch move apart, in each period.
    const poses = tr.at.map((_, p) => pose(p));
    const tagAt = (q: { cx: number; cy: number; r: number }, left: boolean) => ({ x: left ? q.cx - q.r - 8 : q.cx + q.r + 8, y: q.cy + typeSize("label", FONT) * 0.35 });
    const lefts = tr.names.map((name, i) => Math.max(...poses.map((ps) => ps[i].cx + ps[i].r)) + 16 + name.length * 12 > R.x + R.w);
    const tagPoses = poses.map((ps) => {
      const at = ps.map((q, i) => tagAt(q, lefts[i]));
      const ys = tagSpread(at.map((a, i) => ({ ...a, w: (tr.names[i].length * 12 * typeSize("label", FONT)) / FONT, left: lefts[i] })), typeSize("label", FONT) + 4); // about 12 px per character
      return at.map((a, i) => ({ x: a.x, y: ys[i] }));
    });
    const dots = tr.names.map((name, i) => {
      cur = i;
      const q = poses[0][i];
      const c = svg(marks, "circle", { cx: q.cx, cy: q.cy, r: q.r });
      Object.assign(c.style, { fill: groupOf ? groupFill(name) : color(0), fillOpacity: type === "bubble" ? "0.75" : "1", stroke: "var(--k-bg)", strokeWidth: "2" });
      grow({ el: c, origin: "50% 50%", scale: "scale" });
      const tag = valueAt({ ...tagPoses[0][i], "text-anchor": lefts[i] ? "end" : "start" }, 0, 0, () => name);
      cur = -1;
      return { c, tag };
    });
    xAxis = d3.axisBottom(x).ticks(6).tickSizeOuter(0).tickFormat(d3.format(",~f"));
    yAxis = d3.axisLeft(y).ticks(5).tickSizeOuter(0).tickFormat(d3.format(",~f"));
    scatterAxes = true;
    let at = 0; // the period the steps added so far end on
    const numeric = tr.periods.every((p) => Number.isFinite(+p));
    if (tr.period)
      moveTo = (p, tl) => {
        const to = typeof p === "number" ? p : tr.periods.indexOf(p);
        if (!(to >= 0 && to < tr.periods.length)) return ctx.problem(`chart: no period ${JSON.stringify(p)}; the periods are ${tr.periods.join(", ")}`);
        const [a, b, from] = [poses[at], poses[to], at];
        const d = { duration: motion.step * 2, ease: "power1.inOut", immediateRender: false };
        dots.forEach(({ c, tag }, i) => {
          tl.fromTo(c, { attr: a[i] }, { attr: b[i], ...d }, i ? "<" : undefined);
          tl.fromTo(tag, { attr: tagPoses[from][i] }, { attr: tagPoses[to][i], ...d }, "<");
        });
        // A numeric period counts as a pure function of progress; a named one switches halfway.
        tl.to({}, {
          duration: d.duration,
          ease: d.ease,
          onUpdate(this: gsap.core.Tween) {
            const q = this.ratio;
            const [pa, pb] = [tr.periods[from], tr.periods[to]];
            stamp.textContent = numeric ? String(Math.round(+pa + (+pb - +pa) * q)) : q < 0.5 ? pa : pb;
          },
        }, "<");
        at = to;
      };
  } else if (type === "radar") {
    // Dimensions round the circle from 12 o'clock, clockwise; rings at the value ticks; one closed shape per series,
    // which grows from the centre. Values sit just inside each corner, for one series only: two would collide.
    const n = data.length;
    const [cx, cy] = [P.x + P.w / 2, P.y + P.h / 2];
    const r0 = Math.max(60, Math.min(P.h / 2 - typeSize("label", FONT) * 2.5, P.w / 2 - charW() * longest - 32));
    const rv = d3.scaleLinear().domain([0, d3.max(data.flatMap((r) => keys.map((k) => num(r, k)))) || 1]).nice().range([0, r0]);
    const at = (i: number, value: number, out = 0): [number, number] => {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
      return [cx + (rv(value) + out) * Math.cos(a), cy + (rv(value) + out) * Math.sin(a)];
    };
    const top = rv.domain()[1];
    const ring = (value: number) => data.map((_, i) => at(i, value).join(" ")).join("L");
    for (const tick of rv.ticks(4).filter((x) => x > 0)) {
      const g = svg(root, "path", { d: `M${ring(tick)}Z`, fill: "none", "stroke-width": 2 });
      g.style.stroke = "var(--k-line)";
      labels.push(g);
      if (keys.length === 1) continue; // one series shows its values, which say more than the rings
      const tag = text(root, fmt(tick), { x: cx + 8, y: cy - rv(tick) - 6 });
      tag.style.fill = "var(--k-muted)";
      labels.push(tag);
    }
    data.forEach((_, i) => {
      const [x, y] = at(i, top);
      const spoke = svg(root, "line", { x1: cx, y1: cy, x2: x, y2: y, "stroke-width": 2 });
      spoke.style.stroke = "var(--k-line)";
      const [nx, ny] = at(i, top, 20);
      const c = (nx - cx) / (r0 + 20);
      const anchor = c > 0.3 ? "start" : c < -0.3 ? "end" : "middle";
      labels.push(spoke, text(root, names[i], { x: nx, y: ny + typeSize("label", FONT) * 0.35 + ((ny - cy) / (r0 + 20)) * typeSize("label", FONT) * 0.6, "text-anchor": anchor, "font-weight": 700 }));
    });
    keys.forEach((k, si) => {
      cur = si;
      const shape = svg(marks, "path", { d: `M${data.map((r, i) => at(i, num(r, k)).join(" ")).join("L")}Z`, "stroke-width": 4, "stroke-linejoin": "round" });
      Object.assign(shape.style, { fill: color(si), fillOpacity: "0.25", stroke: color(si) });
      grow({ el: shape, origin: "50% 50%", svgOrigin: `${cx} ${cy}`, scale: "scale" });
      data.forEach((r, i) => {
        const [x, y] = at(i, num(r, k));
        const dot = svg(root, "circle", { cx: x, cy: y, r: 7 });
        dot.style.fill = color(si);
        grow({ el: dot, origin: "50% 50%", scale: "scale" });
        if (keys.length > 1) return;
        const [vx, vy] = at(i, num(r, k), -30);
        valueAt({ x: vx, y: vy + typeSize("label", FONT) * 0.35, "text-anchor": "middle" }, 0, num(r, k), fmt);
      });
    });
    cur = -1;
  } else if (type === "heatmap") {
    // Rows down, number columns across; each cell shaded from near --k-bg (the lowest value) to --k-accent (the
    // highest). A value shows in its cell where it fits. cell() moves an accent outline from cell to cell.
    const all = data.flatMap((r) => keys.map((k) => num(r, k)));
    const [lo, hi] = d3.extent(all) as [number, number];
    const share = (n: number) => (hi > lo ? (n - lo) / (hi - lo) : 1);
    const shade = (n: number) => `color-mix(in srgb, var(--k-accent) ${Math.round(12 + 88 * share(n))}%, var(--k-bg))`;
    const [cw, ch] = [P.w / keys.length, P.h / data.length];
    const GAP = 4;
    keys.forEach((k, j) => labels.push(text(root, k, { x: P.x + (j + 0.5) * cw, y: P.y - 14, "text-anchor": "middle", "font-weight": 700 })));
    data.forEach((r, i) => {
      cur = i;
      labels.push(text(root, names[i], { x: P.x - 16, y: P.y + (i + 0.5) * ch + typeSize("label", FONT) * 0.35, "text-anchor": "end" }));
      keys.forEach((k, j) => {
        const n = num(r, k);
        const c = svg(marks, "rect", { x: P.x + j * cw + GAP / 2, y: P.y + i * ch + GAP / 2, width: cw - GAP, height: ch - GAP, rx: 4 });
        c.style.fill = shade(n);
        bars.push(c);
        grow({ el: c, origin: "50% 50%", scale: "scale" });
        if (charW() * fmt(n).length + 16 > cw || ch < typeSize("label", FONT) + 8) return;
        valueAt({ x: P.x + (j + 0.5) * cw, y: P.y + (i + 0.5) * ch + typeSize("label", FONT) * 0.35, "text-anchor": "middle" }, 0, n, fmt).style.strokeWidth = "4px";
      });
    });
    cur = -1;
    // The ramp in the legend row: the lowest value, five shades, the highest.
    const ramp = svg(root, "g", {});
    text(ramp, fmt(lo), { x: R.x, y: R.y + 79 });
    const x0 = R.x + charW() * fmt(lo).length + 16;
    for (let q = 0; q < 5; q++) svg(ramp, "rect", { x: x0 + q * 30, y: R.y + 62, width: 26, height: 18, rx: 3 }).style.fill = shade(lo + ((hi - lo) * q) / 4);
    text(ramp, fmt(hi), { x: x0 + 5 * 30 + 8, y: R.y + 79 });
    head.push(ramp);
    cellAt = (row, col) => ({ x: P.x + col * cw, y: P.y + row * ch });
    outline = svg(root, "rect", { x: P.x, y: P.y, width: cw, height: ch, rx: 6, fill: "none", "stroke-width": 5, "data-k-cell": "" });
    outline.style.stroke = "var(--k-fg)";
  } else if (type === "treemap") {
    // Tiles by value, largest first (squarified); with groups, each group a block under its name, tiles in its colour.
    // A tile names itself and gives its value and share where they fit.
    const k = keys[0];
    const total = d3.sum(data, (r) => num(r, k));
    type Node = { i?: number; children?: Node[] };
    const leaves: Node[] = data.map((_, i) => ({ i }));
    const tree: Node = { children: leaf ? tileGroups.map((g) => ({ children: leaves.filter((n) => String(data[n.i!][label]) === g) })) : leaves };
    const h = d3.hierarchy(tree).sum((n) => (n.i === undefined ? 0 : num(data[n.i], k))).sort((a, b) => b.value! - a.value!);
    d3.treemap<Node>().size([P.w, P.h]).paddingInner(4).paddingTop((n) => (n.depth === 1 ? typeSize("label", FONT) + 16 : 0))(h);
    if (leaf)
      for (const g of (h.children ?? []) as d3.HierarchyRectangularNode<Node>[])
        labels.push(text(root, String(data[g.leaves()[0].data.i!][label]), { x: P.x + g.x0 + 4, y: P.y + g.y0 + typeSize("label", FONT), "font-weight": 700 }));
    // In data order, as bars and bar(i) are; the layout placed them largest first.
    for (const n of (h.leaves() as d3.HierarchyRectangularNode<Node>[]).sort((a, b) => a.data.i! - b.data.i!)) {
      const i = n.data.i!;
      cur = i;
      const fill = leaf ? SLICES[tileGroups.indexOf(String(data[i][label])) % SLICES.length] : color(0);
      const [x, y, w, hh] = [P.x + n.x0, P.y + n.y0, n.x1 - n.x0, n.y1 - n.y0];
      const tile = svg(marks, "rect", { x, y, width: Math.max(1, w), height: Math.max(1, hh), rx: 4 });
      tile.style.fill = fill;
      bars.push(tile);
      const nm = leaf ? String(data[i][leaf]) : names[i];
      const fits = w >= charW() * Math.max(nm.length, fmt(num(data[i], k)).length + 6) + 24 && hh >= typeSize("label", FONT) * 2 + 28;
      const on = barInk(token(ctx.html, fill.slice(4, -1)), token(ctx.html, "--k-bg"), token(ctx.html, "--k-fg"));
      const ink = (el: SVGElement) => Object.assign(el.style, on ? { fill: on, stroke: "none" } : { stroke: "var(--k-bg)", strokeWidth: "4px", strokeLinejoin: "round", paintOrder: "stroke" });
      const name = fits ? text(root, nm, { x: x + 12, y: y + typeSize("label", FONT) + 8, "font-weight": 700 }) : undefined;
      if (name) ink(name);
      grow({ el: tile, origin: "50% 50%", scale: "scale", label: name });
      if (fits) ink(valueAt({ x: x + 12, y: y + 2 * typeSize("label", FONT) + 16 }, 0, num(data[i], k), (v) => `${fmt(v)} · ${Math.round((v / total) * 100)} %`));
    }
    cur = -1;
  } else if (type === "timeline") {
    const [a, b] = span(series);
    const x = d3.scaleLinear().domain(v.domain()).range([P.x, P.x + P.w]);
    const y = d3.scaleBand().domain(band).range([P.y, P.y + P.h]).padding(0.35);
    const tdec = decimals(data.flatMap((r) => [num(r, a), num(r, b)]));
    data.forEach((r, i) => {
      cur = i;
      const [s, e] = [num(r, a), num(r, b)];
      const top = y(band[i])!;
      const rect = svg(marks, "rect", { x: x(s), y: top, width: x(e) - x(s), height: y.bandwidth() });
      rect.style.fill = color(i);
      bars.push(rect);
      grow({ el: rect, origin: "0% 50%", scale: "scaleX" });
      const yc = top + y.bandwidth() / 2 + typeSize("label", FONT) * 0.35;
      valueAt({ x: x(e) + 10, y: yc }, s, e, (n) => `${s.toFixed(tdec)}–${n.toFixed(tdec)}`);
      cur = -1;
    });
    refAt = (n) => ({ x1: x(n), y1: P.y, x2: x(n), y2: P.y + P.h });
    xAxis = d3.axisBottom(x).ticks(6).tickFormat(d3.format("d"));
    yAxis = d3.axisLeft(y).tickSize(0).tickPadding(12).tickFormat((k) => names[+k]);
  } else {
    // Below zero, value labels sit under their bars: keep them clear of the category labels.
    v.range([P.y + P.h - (v.domain()[0] < 0 ? typeSize("label", FONT) + 16 : 0), P.y]);
    refAt = (n) => ({ x1: P.x, y1: v(n), x2: P.x + P.w, y2: v(n) });
    if (type === "line") {
      const x = d3.scalePoint().domain(band).range([P.x, P.x + P.w]).padding(0.5);
      // One clip per series, all made first, so grow draws the lines together, then pops the markers.
      const ids = keys.map((_, i) => {
        cur = i;
        const id = `k-chart-clip-${++clips}`;
        const clip = svg(svg(root, "clipPath", { id }), "rect", { x: R.x, y: R.y, width: R.w, height: R.h });
        grow({ el: clip, origin: "0% 50%", scale: "scaleX", dur: motion.step * 2 }); // the line draws left to right
        return id;
      });
      keys.forEach((k, i) => {
        cur = i;
        const path = svg(marks, "path", {
          d: d3.line<Row>((_, j) => x(band[j])!, (r) => v(num(r, k)))(data) ?? "",
          fill: "none",
          "stroke-width": 5,
          "stroke-linejoin": "round",
          "clip-path": `url(#${ids[i]})`,
        });
        path.style.stroke = color(i);
        strokes.push({ el: path, part: i });
        data.forEach((r, j) => {
          const [n, cx] = [num(r, k), x(band[j])!];
          const c = svg(root, "circle", { cx, cy: v(n), r: 8 });
          c.style.fill = color(i);
          grow({ el: c, origin: "50% 50%", scale: "scale" });
          // Below the marker for a negative value, above it otherwise.
          const y = n < 0 ? v(n) + typeSize("label", FONT) + 14 : v(n) - 16;
          valueAt({ x: cx, y, "text-anchor": "middle" }, 0, n, fmt);
        });
      });
      cur = -1;
      xAxis = categories(x, names);
    } else {
      const x = d3.scaleBand().domain(band).range([P.x, P.x + P.w]).padding(0.3);
      const left = (i: number) => x(band[i])!;
      // A value label above the bar's end, or below it when the bar runs down.
      const barValue = (lo: number, hi: number, i: number, to: number, show: (n: number) => string) => {
        const y = hi < lo ? v(hi) + typeSize("label", FONT) + 8 : v(hi) - 10;
        valueAt({ x: left(i) + x.bandwidth() / 2, y, "text-anchor": "middle" }, 0, to, show);
      };
      if (type === "stacked") {
        const layers = d3.stack<Row>().keys(keys).value((r, k) => num(r, k)).offset(d3.stackOffsetDiverging)(data);
        layers.forEach((layer, li) =>
          layer.forEach(([lo, hi], i) => {
            cur = i;
            bar(left(i), x.bandwidth(), lo, hi, color(li), hi >= lo && lo >= 0);
          }),
        );
        // With a part below zero the stack's height is not its sum: say "net".
        data.forEach((r, i) => {
          cur = i;
          const net = keys.some((k) => num(r, k) < 0);
          const pos = d3.sum(keys, (k) => Math.max(0, num(r, k)));
          barValue(0, pos, i, d3.sum(keys, (k) => num(r, k)), net ? (n) => `${t("net", ctx.deck.lang)} ${fmt(n)}` : fmt);
        });
      } else if (type === "waterfall") {
        const signed = d3.format(`+,.${dec}f`);
        const steps = waterfallSteps(data.map((r) => num(r, keys[0])));
        steps.forEach(([lo, hi], i) => {
          cur = i;
          // The first row is the starting value, not a change.
          bar(left(i), x.bandwidth(), lo, hi, i === 0 ? color(0) : hi >= lo ? UP : DOWN, hi >= lo);
          barValue(lo, hi, i, hi - lo, i === 0 ? fmt : signed);
        });
        const total = steps[steps.length - 1][1];
        cur = names.length - 1;
        bar(left(names.length - 1), x.bandwidth(), 0, total, color(0), total >= 0);
        barValue(0, total, names.length - 1, total, fmt);
      } else
        data.forEach((r, i) => {
          cur = i;
          const n = num(r, keys[0]);
          bar(left(i), x.bandwidth(), 0, n, color(0), n >= 0);
          barValue(0, n, i, n, fmt);
          plain.push({ rect: bars[bars.length - 1], val: values[values.length - 1].el, place: (m: number) => (m < 0 ? v(m) + typeSize("label", FONT) + 8 : v(m) - 10) });
        });
      cur = -1;
      xAxis = categories(x, names);
    }
    yAxis = d3.axisLeft(v).ticks(5).tickSizeOuter(0).tickFormat(d3.format(",~f"));
  }

  const axisAt = (axis: d3.Axis<any>, dx: number, dy: number) => {
    const g = svg(root, "g", { transform: `translate(${dx} ${dy})` });
    d3.select(g).call(axis).attr("font-size", typeSize("label", FONT)).attr("font-family", null);
    g.style.color = "var(--k-fg)";
    root.insertBefore(g, marks);
    return g;
  };
  const axesEls: SVGElement[] = [...(xAxis ? [axisAt(xAxis, 0, P.y + P.h)] : []), ...(yAxis ? [axisAt(yAxis, P.x, 0)] : []), ...labels];
  if (scatterAxes) axesEls.slice(0, 2).forEach((g) => g.querySelector(".domain")?.remove());
  if (!["timeline", "donut", "slope", "funnel", "sankey", "scatter", "bubble", "radar", "heatmap", "treemap"].includes(type)) {
    axesEls[0].querySelector(".domain")?.remove();
    const z = svg(root, "line", { x1: P.x, x2: P.x + P.w, y1: v(0), y2: v(0), "stroke-width": 2 });
    z.style.stroke = "var(--k-fg)";
    axesEls.push(z);
  }

  // Reference lines over the marks; a label above the line at its right end, or right of a timeline's at its top.
  for (const { value, label } of refs) {
    const at = refAt!(value);
    const ref = svg(root, "line", { ...at, "stroke-width": 2, "stroke-dasharray": "10 8", "data-k-ref": label });
    ref.style.stroke = "var(--k-fg)";
    const across = at.y1 === at.y2;
    const tag = text(root, label, across ? { x: at.x2, y: at.y1 - 10, "text-anchor": "end", "font-weight": 700 } : { x: at.x1 + 10, y: at.y1 + typeSize("label", FONT), "font-weight": 700 });
    Object.assign(tag.style, { stroke: "var(--k-bg)", strokeWidth: "6px", strokeLinejoin: "round", paintOrder: "stroke" });
    axesEls.push(ref, tag);
  }
  for (const { el, from, show } of values) el.textContent = show(from);
  for (const e of values) e.el.setAttribute("data-k-text", "");
  gsap.set([...head, ...axesEls, ...values.map((e) => e.el), ...accents, ...grown.flatMap((g) => g.label ?? [])], { autoAlpha: 0 });
  for (const { el, origin, svgOrigin, scale } of grown) gsap.set(el, { [scale]: 0, ...(svgOrigin ? { svgOrigin } : { transformOrigin: origin }) });
  for (const { el, len } of sweeps) gsap.set(el, { strokeDashoffset: len, autoRound: false });
  let shownCol = cols[0]; // the column the to() steps added so far leave shown
  let lit = -1; // the sankey flow the steps added so far end on
  let litPart: number | null = null; // the part highlight() left lit, in step order
  let sliced = 0; // the donut total the slice() steps added so far count to
  let litCell: { x: number; y: number } | null = null; // where the cell() steps so far left the heatmap outline
  if (outline) gsap.set(outline, { autoAlpha: 0 });
  const parts = 1 + Math.max(-1, ...[...grown, ...values, ...sweeps].map((e) => e.part));
  // What dims with each part: its marks (not the clips that draw a line on), strokes and values.
  const partEls = Array.from({ length: parts }, (_, p) => [
    ...grown.filter((g) => g.part === p && !g.el.closest("clipPath")).map((g) => g.el),
    ...[...sweeps, ...strokes, ...values].filter((e) => e.part === p).map((e) => e.el),
  ]);
  // Grows part i's marks, draws its arcs round and fades in and counts its values: one bar, slice or series.
  const counted = new Set<number>(); // the parts bar(), slice() and series() steps so far counted up
  const reveal = (i: number, tl: gsap.core.Timeline, extra: (typeof values)[number][] = []) => {
    counted.add(i);
    const t0 = tl.duration();
    for (const { el, len } of sweeps.filter((e) => e.part === i))
      tl.to(el, { strokeDashoffset: 0, duration: Math.max(motion.step, 1.2 * len), ease: "power2.out", autoRound: false }, t0);
    const gs = grown.filter((g) => g.part === i);
    const stagger = Math.min(0.12, 1 / gs.length);
    gs.forEach(({ el, scale, dur, label }, k) => {
      tl.to(el, { [scale]: 1, duration: dur ?? motion.step, ease: "power2.out" }, t0 + k * stagger);
      if (label) tl.to(label, { autoAlpha: 1, duration: motion.step }, "<");
    });
    const vs = [...values.filter((e) => e.part === i), ...extra];
    tl.to(vs.map((e) => e.el), { autoAlpha: 1, duration: motion.step / 2 }, t0);
    // Count up as a pure function of this tween's progress, so play equals seek.
    tl.to({}, {
      duration: motion.step * 2,
      onUpdate(this: gsap.core.Tween) {
        const p = ease(this.progress());
        for (const { el, from, to, show } of vs) el.textContent = show(from + (to - from) * p);
      },
    }, t0);
  };
  // highlight() tweens opacity from 1: write that start at load, so a seek back over it leaves what play leaves.
  const dimmable = partEls.flat().filter((el) => !values.some((e) => e.el === el));
  if (dimmable.length) gsap.set(dimmable, { opacity: 1 }); // a sankey has no parts; GSAP warns on an empty target list
  const outOf = (what: string, i: number, n: number) =>
    !(i >= 0 && i < n) && ctx.problem(`chart: no ${what} ${i}; the ${what === "series" ? what : `${what}s`} are 0 to ${n - 1}`);

  return {
    bars,
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
      grown.forEach(({ el, scale, dur, label }, i) => {
        tl.to(el, { [scale]: 1, duration: dur ?? motion.step, ease: "power2.out" }, i ? `<${step}` : ">");
        if (label) tl.to(label, { autoAlpha: 1, duration: motion.step }, "<");
      });
    },
    values(tl) {
      // A value an earlier bar() or slice() step counted stays; a donut's total counts on from the slices shown.
      const vs = values
        .filter((e) => !counted.has(e.part))
        .map((e) => (values.indexOf(e) === donutTotal ? { ...e, from: sliced } : e));
      if (!vs.length) return; // a radar with two series has none
      tl.to(vs.map((e) => e.el), { autoAlpha: 1, duration: motion.step / 2 });
      // Count up as a pure function of this tween's progress, so play equals seek.
      const count = {
        duration: motion.step * 2,
        onUpdate(this: gsap.core.Tween) {
          const p = ease(this.progress());
          for (const { el, from, to, show } of vs) el.textContent = show(from + (to - from) * p);
        },
      };
      tl.to({}, count, "<");
    },
    // The step order, not the call order, decides what was lit before: bookkeeping inside the adder.
    highlight: (row) => (tl) => {
      const d = { duration: motion.step, immediateRender: false };
      if (type === "sankey") {
        if (row !== null && !(row >= 0 && row < accents.length)) return ctx.problem(`chart: no flow in row ${row + 1}: ${opts.src}`);
        const to = row ?? -1;
        if (to === lit) return;
        if (lit >= 0) tl.fromTo(accents[lit], { autoAlpha: 1 }, { autoAlpha: 0, ...d });
        if (to >= 0) tl.fromTo(accents[to], { autoAlpha: 0 }, { autoAlpha: 1, ...d }, lit >= 0 ? "<" : undefined);
        lit = to;
        return;
      }
      if (row !== null && outOf(type === "line" || type === "radar" ? "series" : "row", row, parts)) return;
      if (row === litPart) return;
      const level = (p: number, on: number | null) => (on === null || p === on ? 1 : DIM);
      const t0 = tl.duration();
      partEls.forEach((els, p) => {
        const [a, b] = [level(p, litPart), level(p, row)];
        if (a !== b) tl.fromTo(els, { opacity: a }, { opacity: b, ...d }, t0);
      });
      litPart = row;
    },
    period: (p) => (tl) => {
      if (!moveTo) return ctx.problem(`chart: period() is for a scatter or bubble chart with a period column: ${opts.src}`);
      moveTo(p, tl);
    },
    // The step order, not the call order, decides the column it moves from.
    to: (column) => (tl) => {
      if (!moving) return ctx.problem(`chart: to() needs a bar or donut chart with columns: ${opts.src}`);
      if (!cols.includes(column)) {
        ctx.problem(`chart: no column "${column}" in columns; they are ${cols.join(", ")}`);
        return void tl.set({}, {}, tl.duration() + 0.4); // the step still takes a beat
      }
      const [a, b] = [shownCol, column];
      shownCol = column;
      const was = data.map((r) => num(r, a));
      const now = data.map((r) => num(r, b));
      const t0 = tl.duration();
      const d = { duration: motion.step * 2, ease: "power2.inOut", immediateRender: false };
      tl.set(colName!, { textContent: b, immediateRender: false }, t0 + d.duration / 2);
      if (ring) {
        const [s0, s1] = [donutSlices(was), donutSlices(now)];
        const [t0s, t1s] = [d3.sum(was), d3.sum(now)];
        const deg = (sl: { start: number }) => -90 + (sl.start + ring!.gap / 2) * 360;
        ring.arcs.forEach((arc, i) => {
          const len = (sl: { share: number }) => Math.max(0.001, sl.share - ring!.gap);
          tl.fromTo(arc, { attr: { transform: `rotate(${deg(s0[i])} ${ring!.cx} ${ring!.cy})` }, strokeDasharray: `${len(s0[i])} 1` },
            { attr: { transform: `rotate(${deg(s1[i])} ${ring!.cx} ${ring!.cy})` }, strokeDasharray: `${len(s1[i])} 1`, ...d }, t0);
        });
        tl.to({}, { ...d, onUpdate(this: gsap.core.Tween) {
          const p = this.ratio;
          const total = t0s + (t1s - t0s) * p;
          ring!.total!.textContent = fmt(total);
          ring!.vals.forEach(([val, share], i) => {
            const n = was[i] + (now[i] - was[i]) * p;
            val.textContent = fmt(n);
            share.textContent = `${Math.round((total ? n / total : 0) * 100)} %`;
          });
        } }, t0);
        return;
      }
      plain.forEach(({ rect, val, place }, i) => {
        const box = (n: number) => ({ y: Math.min(v(0), v(n)), height: Math.abs(v(0) - v(n)) });
        tl.fromTo(rect, { attr: box(was[i]) }, { attr: box(now[i]), ...d }, t0);
        tl.fromTo(val, { attr: { y: place(was[i]) } }, { attr: { y: place(now[i]) }, ...d }, t0);
      });
      tl.to({}, { ...d, onUpdate(this: gsap.core.Tween) {
        plain.forEach(({ val }, i) => (val.textContent = fmt(was[i] + (now[i] - was[i]) * this.ratio)));
      } }, t0);
    },
    bar: (i) => (tl) => {
      if (!["bar", "waterfall", "stacked", "timeline", "funnel", "treemap"].includes(type))
        return ctx.problem(`chart: bar(${i}) is for bar, waterfall, stacked, timeline, funnel and treemap charts, not ${type}`);
      if (!outOf("bar", i, parts)) reveal(i, tl);
    },
    slice: (i) => (tl) => {
      if (type !== "donut") return ctx.problem(`chart: slice(${i}) is for a donut chart, not ${type}`);
      if (outOf("slice", i, parts)) return;
      // The total counts on from the slices the steps before drew, in step order.
      const total = values[donutTotal];
      const to = sliced + num(data[i], keys[0]);
      reveal(i, tl, [{ ...total, from: sliced, to }]);
      sliced = to;
    },
    series: (i) => (tl) => {
      if (type !== "line" && type !== "radar") return ctx.problem(`chart: series(${i}) is for a line or radar chart, not ${type}`);
      if (!outOf("series", i, parts)) reveal(i, tl);
    },
    // The step order, not the call order, decides where the outline comes from.
    cell: (row, col = 0) => (tl) => {
      if (!cellAt || !outline) return ctx.problem(`chart: cell() is for a heatmap, not ${type}`);
      if (row !== null && !(row >= 0 && row < data.length && col >= 0 && col < keys.length))
        return ctx.problem(`chart: no cell ${row}, ${col}; the rows are 0 to ${data.length - 1}, the columns 0 to ${keys.length - 1}`);
      const to = row === null ? null : cellAt(row, col);
      const d = { duration: motion.step, immediateRender: false };
      if (to && litCell) tl.fromTo(outline, { attr: litCell }, { attr: to, ...d });
      else if (to) tl.fromTo(outline, { attr: to, autoAlpha: 0 }, { attr: to, autoAlpha: 1, ...d });
      else if (litCell) tl.fromTo(outline, { autoAlpha: 1 }, { autoAlpha: 0, ...d });
      litCell = to;
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
  const P = { x: R.x + Math.min(R.w * 0.3, 24 + longest * charW()), y: R.y + 120, w: 0, h: R.h - 120 - 24 };
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
    s.style.fill = "var(--k-warn)";
    head.push(s);
  }
  const axis = svg(root, "g", { transform: `translate(${P.x} ${P.y - 12})` });
  d3.select(axis).call(d3.axisTop(x).ticks(5).tickSizeOuter(0).tickFormat(d3.format(",~f"))).attr("font-size", typeSize("label", FONT)).attr("font-family", null);
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
    text(g, k, { x: P.x - 14, y: slot / 2 + typeSize("label", FONT) * 0.35, "text-anchor": "end" });
    const value = text(g, "", { x: P.x + 10, y: slot / 2 + typeSize("label", FONT) * 0.35 });
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
