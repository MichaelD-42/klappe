import { gsap } from "gsap";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { dataError, keysOf, parseCsv, showsSample, type Row } from "./chart";
import { typeSize } from "./draw";

export interface CloudWord {
  text: string;
  weight: number;
}
export interface PlacedWord extends CloudWord {
  size: number; // font size, scene px
  x: number; // the word box's top-left corner and size, scene-local
  y: number;
  w: number;
  h: number;
}
export interface WordCloudOpts {
  src: string; // the data file, "data/x.csv": first column the word, the first number column its weight
  data?: Row[] | null; // null: the file is missing; left out: read src from ctx.files.data
  rect: Rect;
  max?: number; // the heaviest word's font size; default rect.h / 5, at most 160
  sample?: boolean;
}
export interface WordCloudHandle {
  el: HTMLElement;
  words: string[]; // heaviest first: the order show() counts in
  show(from?: number, to?: number): StepAdder;
}

// Width per character and line height, in font sizes. An estimate, not a measure: the layout is the same on
// every machine and in CI, whatever the rasteriser. Each class is a little wider than its widest letter in
// Inter 700 and Space Grotesk 700; the pad covers the rest.
const charW = (c: string) => (/[WMmw@]/.test(c) ? 1 : /[iljtfrI.,:;'!|]/.test(c) ? 0.36 : /[A-Z0-9]/.test(c) ? 0.72 : 0.62);
const textW = (s: string) => [...s].reduce((sum, c) => sum + charW(c), 0);
const LINE = 1.3; // the theme fonts' ascent plus descent: Inter 1.21, Space Grotesk 1.28 font sizes
const MIN = 24;
export const MAX_WORDS = 60; // more is no longer a cloud the room can read, and the spiral search grows with the square

const hit = (a: Rect, b: Rect) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

// Words heaviest first, each sized by the square root of its weight (area follows weight) and placed on an
// Archimedean spiral out from the centre of rect at the first spot where its box touches no other box.
// When a word does not fit inside rect, every size shrinks by 10 % and the layout starts again (up to 12
// times); words that still do not fit are left out. Only the MAX_WORDS heaviest are placed. Ties keep input order. Pure: the same words give the same layout.
export function cloudLayout(words: CloudWord[], rect: Rect, max = Math.min(160, rect.h / 5)): PlacedWord[] {
  const sorted = words.map((w, i) => ({ w, i })).sort((a, b) => b.w.weight - a.w.weight || a.i - b.i).map((x) => x.w).slice(0, MAX_WORDS);
  const top = sorted[0]?.weight ?? 1;
  const cx = rect.x + rect.w / 2;
  const cy = rect.y + rect.h / 2;
  const reach = Math.hypot(rect.w, rect.h) / 2;
  const aspect = rect.w / rect.h; // the spiral is as wide as rect, so the cloud fills a wide frame
  let out: PlacedWord[] = [];
  for (let k = 0, scale = 1; k < 12; k++, scale *= 0.9) {
    out = [];
    for (const word of sorted) {
      const size = Math.max(MIN, max * scale * Math.sqrt(word.weight / top));
      const w = (textW(word.text) + 0.3) * size;
      const h = size * LINE;
      for (let a = 0; ; a += 0.1) {
        const r = 2 * a;
        if (r > reach) break;
        const box = { x: cx + r * Math.cos(a) * aspect - w / 2, y: cy + r * Math.sin(a) - h / 2, w, h };
        if (box.x < rect.x || box.y < rect.y || box.x + w > rect.x + rect.w || box.y + h > rect.y + rect.h) continue;
        if (out.some((o) => hit(o, box))) continue;
        out.push({ ...word, size, ...box });
        break;
      }
    }
    if (out.length === sorted.length) break;
  }
  return out;
}

// A word cloud from a data/ file: words sized by weight, placed without overlap, heaviest in --k-accent and
// the rest in the series colours. show(from, to) brings in words from..to-1 in weight order, heaviest first.
export function wordCloud(ctx: Ctx, opts: WordCloudOpts): WordCloudHandle {
  const R = opts.rect;
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-cloud", opts.src);
  Object.assign(root.style, { position: "absolute", left: "0", top: "0" });
  const fail = (label: string, why: string): WordCloudHandle => {
    ctx.problem(`wordCloud: ${label}: ${opts.src}${why ? ` (${why})` : ""}`);
    root.textContent = `${label}: ${opts.src}`;
    Object.assign(root.style, {
      left: `${R.x}px`, top: `${R.y}px`, width: `${R.w}px`, height: `${R.h}px`, boxSizing: "border-box",
      display: "flex", alignItems: "center", justifyContent: "center", border: "4px dashed var(--k-warn)",
      background: "var(--k-bg)", color: "var(--k-warn)", fontSize: `${typeSize("body", 48)}px`, fontWeight: "700",
    });
    gsap.set(root, { autoAlpha: 0 });
    return { el: root, words: [], show: () => (tl) => void tl.to(root, { autoAlpha: 1, duration: motion.step }) };
  };
  const raw = opts.data === undefined ? ctx.files.data[opts.src] : undefined;
  if (opts.data === null || (opts.data === undefined && raw === undefined)) return fail(t("dataMissing", ctx.deck.lang), "");
  const rows: Row[] & { source?: string } = opts.data ?? parseCsv(raw!);
  if (!rows.length) return fail(t("dataMissing", ctx.deck.lang), "no rows");
  const why = dataError(rows, "bar");
  if (why) return fail(t("dataError", ctx.deck.lang), why);
  const [label] = keysOf(rows);
  const weight = keysOf(rows).find((k) => k !== label && typeof rows[0][k] === "number")!;
  const bad = rows.findIndex((r) => !((r[weight] as number) > 0) || !String(r[label]).trim());
  if (bad >= 0) return fail(t("dataError", ctx.deck.lang), `row ${bad + 1}, no word or ${weight} not above zero`);

  root.setAttribute("data-k-note", `${t("source", ctx.deck.lang)}: ${opts.src} — ${rows.source || t("originNotStated", ctx.deck.lang)}`);
  const sample = showsSample(opts.sample, rows.source);
  // The label takes a 40 px strip at the top of rect, so no word sits under it.
  const area = sample ? { ...R, y: R.y + 40, h: R.h - 40 } : R;
  const placed = cloudLayout(rows.map((r) => ({ text: String(r[label]).trim(), weight: r[weight] as number })), area, opts.max);
  if (rows.length > MAX_WORDS) ctx.problem(`wordCloud: ${opts.src} has ${rows.length} words; only the ${MAX_WORDS} heaviest show`);
  const n = Math.min(rows.length, MAX_WORDS);
  if (placed.length < n) ctx.problem(`wordCloud: ${n - placed.length} words of ${opts.src} do not fit in the rect`);
  const els = placed.map((p, i) => {
    const s = root.appendChild(document.createElement("span"));
    s.textContent = p.text;
    s.setAttribute("data-k-word", p.text);
    Object.assign(s.style, {
      position: "absolute", left: `${p.x}px`, top: `${p.y}px`, width: `${p.w}px`, textAlign: "center", whiteSpace: "nowrap",
      font: `700 ${p.size}px/${LINE} var(--k-font)`,
      color: i === 0 ? "var(--k-accent)" : `var(--k-series-${2 + ((i - 1) % 5)})`, // series-1 is the accent in bold
    });
    return s;
  });
  const extra: HTMLElement[] = [];
  if (sample) {
    const s = root.appendChild(document.createElement("div"));
    s.textContent = t("sampleData", ctx.deck.lang);
    Object.assign(s.style, { position: "absolute", left: `${R.x}px`, top: `${R.y}px`, width: `${R.w}px`, textAlign: "right", font: `${typeSize("label", 22)}px var(--k-font)`, color: "var(--k-warn)" });
    extra.push(s);
  }
  gsap.set([...els, ...extra], { autoAlpha: 0, scale: 1 });
  return {
    el: root,
    words: placed.map((p) => p.text),
    show(from = 0, to = els.length) {
      return (tl) => {
        const at = tl.duration();
        // The label shows with any show(), so any step order shows it.
        if (extra.length) tl.to(extra, { autoAlpha: 1, duration: motion.step }, at);
        const some = els.slice(from, to);
        if (!some.length) return;
        if (ctx.reducedMotion) return void tl.fromTo(some, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false }, at);
        tl.fromTo(some, { autoAlpha: 0, scale: 0.6 }, {
          autoAlpha: 1, scale: 1, duration: motion.step * 1.5, ease: "back.out(1.6)", stagger: Math.min(0.12, 1.2 / some.length), immediateRender: false,
        }, at);
      };
    },
  };
}
