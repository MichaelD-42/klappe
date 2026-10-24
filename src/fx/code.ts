import { gsap } from "gsap";
import type { HighlighterCore, LanguageRegistration } from "shiki/core";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

// The fence languages loadHighlighter bundles, each its own chunk; any other language shows plain.
const GRAMMARS: Record<string, () => Promise<{ default: LanguageRegistration[] }>> = {
  ts: () => import("shiki/langs/typescript.mjs"),
  js: () => import("shiki/langs/javascript.mjs"),
  python: () => import("shiki/langs/python.mjs"),
  bash: () => import("shiki/langs/bash.mjs"),
  json: () => import("shiki/langs/json.mjs"),
  yaml: () => import("shiki/langs/yaml.mjs"),
  sql: () => import("shiki/langs/sql.mjs"),
  html: () => import("shiki/langs/html.mjs"),
  css: () => import("shiki/langs/css.mjs"),
};
export const LANGS = Object.keys(GRAMMARS);

export interface CodeOpts {
  src: string;
  lang: string;
  x: number;
  y: number;
  w: number;
  h?: number;
}
export interface CodeHandle {
  show: StepAdder;
  focus(lines: number[]): StepAdder; // 1-based; [] unfocuses everything
  diff(src: string): StepAdder;
  line(n: number): Element; // a callout target
}

let hl: HighlighterCore | null = null;
let wanted = new Set<string>(); // the languages loadHighlighter was asked for, even if it failed

// Shiki's one-time async init with the grammars of langs; main.ts awaits it before the world renders,
// only for a deck that shows code. Shiki itself loads here, so a deck without code never fetches it.
// A failed init is logged once and code shows plain, so the deck never goes blank.
export async function loadHighlighter(langs: string[]): Promise<void> {
  if (wanted.size) return;
  wanted = new Set(langs);
  try {
    const [{ createCssVariablesTheme, createHighlighterCore }, { createJavaScriptRegexEngine }] = await Promise.all([
      import("shiki/core"),
      import("shiki/engine/javascript"),
    ]);
    hl = await createHighlighterCore({
      themes: [createCssVariablesTheme({ name: "klappe", variablePrefix: "--k-code-" })],
      langs: LANGS.filter((l) => wanted.has(l)).map((l) => GRAMMARS[l]()),
      engine: createJavaScriptRegexEngine(),
    });
  } catch (e) {
    console.error("code: syntax highlighting failed to load; code shows plain", e);
  }
}

// The longest range parseGroups expands: no code block has more lines, and {1-99999999} stays small.
export const MAX_LINES = 999;

// A fence's highlight groups, one per step: "1-2|4" gives [[1, 2], [4]]. Ranges are clamped to
// 1..MAX_LINES before they expand; an end outside that stays as written, and a reversed range lists
// high to low, so code() can report both.
export function parseGroups(info: string): number[][] {
  return info.split("|").map((g) =>
    g.split(",").flatMap((r) => {
      if (!r.trim()) return [];
      const [a, b = a] = r.split("-").map(Number);
      const [lo, hi] = [Math.min(a, b), Math.max(a, b)];
      const from = Math.max(lo, 1);
      const to = Math.min(hi, MAX_LINES);
      const run = Array.from({ length: Math.max(0, to - from + 1) }, (_, k) => from + k);
      const out = [...(lo < from ? [lo] : []), ...run, ...(hi > to ? [hi] : [])];
      return b < a ? out.reverse() : out;
    }),
  );
}

export type LineOp = { op: "keep"; from: number; to: number } | { op: "del"; from: number } | { op: "add"; to: number };

// A line diff by longest common subsequence. At a fork, deletions come before additions.
export function lineDiff(a: string[], b: string[]): LineOp[] {
  // lcs[i][j]: the LCS length of a[i..] and b[j..]
  const lcs = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const ops: LineOp[] = [];
  let [i, j] = [0, 0];
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) ops.push({ op: "keep", from: i++, to: j++ });
    else if (i < a.length && (j === b.length || lcs[i + 1][j] >= lcs[i][j + 1])) ops.push({ op: "del", from: i++ });
    else ops.push({ op: "add", to: j++ });
  }
  return ops;
}

const MAX_FONT = 30;
const MIN_FONT = 20; // 14.2 px at 1366, the legibility floor
const LINE_H = 1.4;
const CHAR_W = 0.6; // monospace advance in em, a little wide for safety
const PAD_X = 36;
const PAD_Y = 24;
const BAR = 8; // the focus bar's width
// A dimmed line: its tokens blend fully to --k-muted (at least 4.5:1 on --k-surface by the theme rules)
// at 0.7 opacity, which keeps it above 3:1 on a projector.
const DIM = 0.7;

// Monospace is allowed under .k-code: code is not a label.
const CSS = `
.k-code { position: absolute; margin: 0; box-sizing: border-box; overflow: hidden; border-radius: 12px;
  background: var(--k-surface); color: var(--k-code-foreground); font-family: var(--k-font-code); }
.k-code > div { position: absolute; left: 0; right: 0; top: ${PAD_Y}px; }
.k-code [data-line] { position: absolute; left: 0; right: 0; top: 0; overflow: hidden; white-space: pre; padding-left: ${PAD_X}px; }
.k-code .k-code-bar { position: absolute; left: 0; top: 0; bottom: 0; width: ${BAR}px; background: var(--k-accent); }
.k-code [data-line] span { color: color-mix(in srgb, var(--tok, var(--k-code-foreground)) calc(100% - var(--dim) * 100%), var(--k-muted)); }
.k-code .k-code-more { position: absolute; left: 0; right: 0; top: 0; padding-left: ${PAD_X}px; color: var(--k-muted); font-family: var(--k-font); }
`;

function addStyle() {
  if (document.getElementById("k-code-style")) return;
  const s = document.createElement("style");
  s.id = "k-code-style";
  s.textContent = CSS;
  document.head.append(s);
}

// Sorted numbers as runs: [0, 21, 22, 23, 99] gives "0, 21-23, 99".
function runs(ns: number[]): string {
  const rs: [number, number][] = [];
  for (const k of ns) {
    const last = rs[rs.length - 1];
    if (last && k === last[1] + 1) last[1] = k;
    else rs.push([k, k]);
  }
  return rs.map(([a, b]) => (a === b ? `${a}` : `${a}-${b}`)).join(", ");
}

// One trailing newline is dropped before both paths, so Shiki and plain text count the same lines.
const trim = (src: string) => src.replace(/\n$/, "");
const splitLines = (src: string) => trim(src).split("\n");

// The code's lines as tokens: Shiki's for a language loadHighlighter loaded, else one plain token per line.
export const codeLines = (src: string, lang: string): { content: string; color?: string }[][] =>
  hl && wanted.has(lang) && LANGS.includes(lang)
    ? hl.codeToTokensBase(trim(src), { lang, theme: "klappe" })
    : splitLines(src).map((content) => [{ content }]);

export function code(ctx: Ctx, opts: CodeOpts): CodeHandle {
  addStyle();
  // main.ts loads a grammar only for a scene.md fence, or a literal lang value in deck code that imports code() by name.
  if (!wanted.has(opts.lang) && LANGS.includes(opts.lang))
    ctx.problem(
      `code: highlighting was not loaded, so "${opts.lang}" shows plain; import code by name (import { code } from "klappe/fx") and write the language as a literal (lang: "${opts.lang}")`,
    );
  const h = opts.h ?? ctx.rect.h - opts.y;
  let texts = splitLines(opts.src);
  const cols = Math.max(1, ...texts.map((t) => t.length));
  const size = Math.max(
    MIN_FONT,
    Math.floor(Math.min(MAX_FONT, (h - 2 * PAD_Y) / (texts.length * LINE_H), (opts.w - PAD_X - PAD_Y) / (cols * CHAR_W))),
  );
  const lh = size * LINE_H;
  const rows = Math.floor((h - 2 * PAD_Y) / lh); // the most lines that show; the rest clip
  const width = Math.floor((opts.w - PAD_X - PAD_Y) / (size * CHAR_W));
  const fits = (n: number) => n <= rows || (ctx.problem(`code: ${n} lines do not fit; max ${rows}`), false);
  fits(texts.length);
  if (cols > width) ctx.problem(`code: lines longer than ${width} characters are clipped`);
  const panelH = (n: number) => Math.min(h, Math.min(n, rows) * lh + 2 * PAD_Y);

  const pre = ctx.html.appendChild(Object.assign(document.createElement("pre"), { className: "k-code" }));
  Object.assign(pre.style, { left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, fontSize: `${size}px`, lineHeight: `${lh}px` });
  const body = pre.appendChild(document.createElement("div"));
  const highlight = (src: string) => codeLines(src, opts.lang);
  // Clipped code gives its last row to a muted "+N more lines" marker; vis is how many lines show.
  const vis = (n: number) => (n > rows ? rows - 1 : n);
  const more = (n: number) => {
    if (n <= rows) return null;
    const e = body.appendChild(Object.assign(document.createElement("div"), { className: "k-code-more" }));
    e.textContent = `+${n - vis(n)} ${t("moreLines", ctx.deck.lang)}`;
    gsap.set(e, { y: (rows - 1) * lh, autoAlpha: 1 });
    return e;
  };

  const bars = new Map<HTMLElement, HTMLElement>();
  // One line at index i, n its data-line number: a bar and one span per token. Lines past the last row hide.
  const makeLine = (tokens: { content: string; color?: string }[], i: number, n: number) => {
    const e = body.appendChild(document.createElement("div"));
    e.dataset.line = String(n);
    const bar = e.appendChild(Object.assign(document.createElement("i"), { className: "k-code-bar" }));
    for (const t of tokens) {
      const s = e.appendChild(document.createElement("span"));
      s.textContent = t.content;
      if (t.color) s.style.setProperty("--tok", t.color);
    }
    bars.set(e, bar);
    gsap.set(e, { y: i * lh, height: lh, opacity: 1, "--dim": 0, visibility: i < vis(texts.length) ? "inherit" : "hidden" });
    gsap.set(bar, { opacity: 0 });
    return e;
  };
  let lines = highlight(opts.src).map((tokens, i) => makeLine(tokens, i, i + 1));
  let marker = more(lines.length);
  gsap.set(pre, { height: panelH(lines.length), autoAlpha: 0 });

  // All tweens of one step start together at the step's end so far.
  const fade = (tl: gsap.core.Timeline, at: number, els: Element[], vars: gsap.TweenVars) => {
    if (els.length) tl.to(els, { duration: motion.step, ...vars }, at);
  };
  const focusAll = (tl: gsap.core.Timeline, on: HTMLElement[], at: number) => {
    const off = lines.filter((e) => !on.includes(e));
    fade(tl, at, on, { opacity: 1, "--dim": 0 });
    fade(tl, at, off, on.length ? { opacity: DIM, "--dim": 1 } : { opacity: 1, "--dim": 0 });
    fade(tl, at, on.map((e) => bars.get(e)!), { opacity: 1 });
    fade(tl, at, off.map((e) => bars.get(e)!), { opacity: 0 });
  };

  return {
    show: (tl) => tl.to(pre, { autoAlpha: 1, duration: motion.step }),
    focus(want) {
      const n = lines.length;
      const bad = [...new Set(want.filter((k) => k < 1 || k > n))].sort((a, b) => a - b);
      if (bad.length) ctx.problem(`code: ${bad.length > 1 ? "lines" : "line"} ${runs(bad)} out of range (1-${n})`);
      if (want.some((k, i) => i > 0 && k < want[i - 1]))
        ctx.problem(`code: lines ${want.join(", ")} out of order; write ranges low to high`);
      const on = lines.filter((_, i) => want.includes(i + 1));
      return (tl) => focusAll(tl, on, tl.duration());
    },
    diff(src) {
      const next = splitLines(src);
      fits(next.length);
      const tokens = highlight(src);
      const ops = lineDiff(texts, next);
      const oldMarker = marker;
      texts = next;
      const added = new Map(ops.flatMap((o) => (o.op === "add" ? [[o.to, makeLine(tokens[o.to], o.to, o.to + 1)] as const] : [])));
      for (const e of added.values()) gsap.set(e, { height: 0, opacity: 0 });
      marker = more(next.length);
      const newMarker = marker;
      if (newMarker) gsap.set(newMarker, { autoAlpha: 0 });
      const before = lines;
      lines = next.map((_, j) => added.get(j)!);
      for (const o of ops) if (o.op === "keep") lines[o.to] = before[o.from];
      return (tl) => {
        const at = tl.duration();
        const shown = (j: number) => (j < vis(next.length) ? "inherit" : "hidden");
        for (const o of ops) {
          // autoAlpha: a collapsed line ends hidden and leaves no trace.
          if (o.op === "del") fade(tl, at, [before[o.from]], { height: 0, autoAlpha: 0 });
          else if (o.op === "keep") {
            tl.set(before[o.from], { visibility: shown(o.to) }, at);
            fade(tl, at, [before[o.from]], { y: o.to * lh, opacity: 1, "--dim": 0 });
          } else {
            tl.set(added.get(o.to)!, { visibility: shown(o.to) }, at);
            tl.fromTo(added.get(o.to)!, { height: 0, opacity: 0 }, { height: lh, opacity: 1, duration: motion.step, immediateRender: false }, at);
          }
        }
        fade(tl, at, [pre], { height: panelH(next.length) });
        if (oldMarker) fade(tl, at, [oldMarker], { autoAlpha: 0 });
        if (newMarker) fade(tl, at, [newMarker], { autoAlpha: 1 });
        // The new code shows unfocused: no bars.
        fade(tl, at, [...bars.values()], { opacity: 0 });
      };
    },
    line(n) {
      const e = lines[n - 1];
      if (!e) throw new Error(`code: no line ${n} (${lines.length} lines)`);
      return e;
    },
  };
}
