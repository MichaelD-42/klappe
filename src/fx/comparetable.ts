import { gsap } from "gsap";
import type { IconNode } from "lucide";
import { t } from "../strings";
import type { Ctx, StepAdder } from "../types";
import { MARKER_MIX } from "./annotate";
import { iconGlyph } from "./icons";
import { typeSize } from "./draw";
import { gapCss, radius } from "./layout";

export interface CompareTableOpts {
  columns: string[]; // the header of each value column, e.g. the products compared
  rows: { label: string; cells: (boolean | string)[] }[]; // true: a tick, false: a cross, "~": partly, another string: that text
  x: number;
  y: number;
  w: number;
  h?: number; // with h, the table shrinks to fit it, down to the floor, then reports a problem
}
export interface CompareTableHandle {
  el: HTMLElement; // the table's block, for a scene that places or moves it
  show: StepAdder; // the header and the grid lines; the rows stay hidden
  row(i: number): StepAdder;
  column(i: number | null): StepAdder; // lights column i from its header through the last row; null lights none
}

// Lucide "check" and "x" (ISC), inline: src/fx is not scanned for icon names, and importing "lucide" would pull every icon in dev.
const CHECK: IconNode = [["path", { d: "M20 6 9 17l-5-5" }]];
const CROSS: IconNode = [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]];
const PARTLY: IconNode = [["path", { d: "M5 12h14" }]]; // Lucide "minus"
const MARK = { yes: [CHECK, "var(--k-ok)"], no: [CROSS, "var(--k-bad)"], partly: [PARTLY, "var(--k-warn)"] } as const;
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 36;

const div = (parent: HTMLElement, style: Partial<CSSStyleDeclaration>, text?: string) => {
  const e = parent.appendChild(document.createElement("div"));
  Object.assign(e.style, style);
  if (text !== undefined) e.textContent = text;
  return e;
};

// A feature matrix: a header in --k-muted, then one row per step. row(i) fades the row in, lands its ticks (--k-ok),
// partly marks (--k-warn) and crosses (--k-bad) cell by cell, and lights its label in --k-accent until the next row step settles it to --k-fg.
// Reduced motion: the marks fade in without the pop.
export function compareTable(ctx: Ctx, opts: CompareTableOpts): CompareTableHandle {
  const cols = opts.columns.length;
  const grid = { display: "grid", gridTemplateColumns: `minmax(0, 2fr) repeat(${cols}, minmax(0, 1fr))`, columnGap: gapCss(24), alignItems: "center" };
  const root = document.createElement("div");
  root.setAttribute("data-k-compare", "");
  Object.assign(root.style, {
    position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, display: "flex", flexDirection: "column",
    font: `600 ${typeSize("body", MAX_FONT)}px/1.25 var(--k-font)`, color: "var(--k-fg)", zIndex: "2",
  });
  const head = div(root, { ...grid, color: "var(--k-muted)", padding: "0 0 0.5em", borderBottom: "2px solid var(--k-line)" });
  div(head, {});
  for (const c of opts.columns) div(head, { textAlign: "center", minWidth: "0", overflowWrap: "anywhere" }, c);
  const rows = opts.rows.map((r, i) => {
    if (r.cells.length !== cols) ctx.problem(`compareTable: row ${i} has ${r.cells.length} cells for ${cols} columns`);
    const row = div(root, { ...grid, padding: "0.45em 0", borderBottom: "1px solid var(--k-line)" });
    const label = div(row, { minWidth: "0", overflowWrap: "anywhere" }, r.label);
    const marks: HTMLElement[] = [];
    r.cells.slice(0, cols).forEach((c) => {
      const cell = div(row, { textAlign: "center", minWidth: "0", overflowWrap: "anywhere", fontWeight: "400" });
      if (typeof c === "string" && c !== "~") return void (cell.textContent = c);
      const kind = c === "~" ? "partly" : c ? "yes" : "no";
      const mark = div(cell, { display: "inline-block", width: "1.2em", height: "1.2em", verticalAlign: "middle", color: MARK[kind][1] });
      mark.setAttribute("role", "img");
      mark.setAttribute("aria-label", t(kind, ctx.deck.lang));
      mark.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${iconGlyph(MARK[kind][0], ctx.problem)}</svg>`;
      marks.push(mark);
    });
    gsap.set(row, { autoAlpha: 0 });
    if (marks.length) gsap.set(marks, { autoAlpha: 0, scale: ctx.reducedMotion ? 1 : 0.4 }); // GSAP warns on an empty target list
    return { row, label, marks };
  });
  ctx.html.append(root);
  gsap.set(root, { autoAlpha: 0 });

  let fits: boolean | undefined;
  const fit = () => {
    if (fits !== undefined) return fits;
    let size = typeSize("body", MAX_FONT);
    const over = () => opts.h !== undefined && root.offsetHeight > opts.h;
    for (; size > FLOOR; size -= 2) {
      root.style.fontSize = `${size}px`;
      if (!over()) break;
    }
    root.style.fontSize = `${size}px`;
    fits = !over();
    if (fits && opts.h !== undefined) root.style.top = `${opts.y + (opts.h - root.offsetHeight) / 2}px`; // centred in h
    if (!fits) ctx.problem(`compareTable: ${rows.length} rows do not fit ${opts.h}px at ${FLOOR}px text`);
    return fits;
  };

  // A column's band: behind the column, from above its header through the last row, made when its step is added
  // (the font is fitted by then). Its header turns --k-accent with it.
  const bands = new Map<number, HTMLElement>();
  const band = (i: number) => {
    if (!bands.has(i)) {
      const cell = head.children[i + 1] as HTMLElement;
      const b = div(root, {
        position: "absolute", left: `${cell.offsetLeft - 12}px`, top: "-12px", width: `${cell.offsetWidth + 24}px`, height: `${root.offsetHeight + 12}px`,
        boxSizing: "border-box", border: "3px solid var(--k-accent)", borderRadius: radius(12), zIndex: "-1",
        background: `color-mix(in srgb, var(--k-accent) ${MARKER_MIX * 100}%, transparent)`,
      });
      b.setAttribute("data-k-compare-column", String(i));
      gsap.set(b, { autoAlpha: 0 });
      bands.set(i, b);
    }
    return bands.get(i)!;
  };
  let litCol: number | null = null; // the column the column steps added so far leave lit

  let last = -1; // the row the previous row step lit; set while the timeline is built, so adders may be made in any order
  return {
    el: root,
    show: (tl) => {
      const at = tl.duration();
      if (!fit()) return void tl.set({}, {}, at + 0.4);
      tl.to(root, { autoAlpha: 1, duration: 0.4 }, at);
    },
    column: (i) => (tl) => {
      const at = tl.duration();
      if (i !== null && !(i >= 0 && i < cols)) ctx.problem(`compareTable: no column ${i}`);
      if ((i !== null && !(i >= 0 && i < cols)) || !fit() || i === litCol) return void tl.set({}, {}, at + 0.4);
      const d = { duration: 0.4, immediateRender: false };
      // The row lit by the step before settles, as the next row step would settle it.
      if (rows[last]) tl.set(rows[last].label, { color: "var(--k-fg)", immediateRender: false }, at);
      last = -1;
      if (litCol !== null) {
        tl.fromTo(band(litCol), { autoAlpha: 1 }, { autoAlpha: 0, ...d }, at);
        tl.set(head.children[litCol + 1], { color: "var(--k-muted)", immediateRender: false }, at);
      }
      if (i !== null) {
        tl.fromTo(band(i), { autoAlpha: 0 }, { autoAlpha: 1, ...d }, at);
        tl.set(head.children[i + 1], { color: "var(--k-accent)", immediateRender: false }, at);
      }
      litCol = i;
    },
    row: (i) => (tl) => {
      const at = tl.duration();
      const r = rows[i];
      if (!r) ctx.problem(`compareTable: no row ${i}`);
      if (!r || !fit()) return void tl.set({}, {}, at + 0.4);
      const prev = last;
      last = i;
      if (rows[prev] && prev !== i) tl.set(rows[prev].label, { color: "var(--k-fg)", immediateRender: false }, at);
      tl.set(r.label, { color: "var(--k-accent)", immediateRender: false }, at);
      tl.fromTo(r.row, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, at);
      if (r.marks.length)
        tl.fromTo(r.marks, { autoAlpha: 0, scale: ctx.reducedMotion ? 1 : 0.4 },
          { autoAlpha: 1, scale: 1, duration: 0.35, ease: ctx.reducedMotion ? "none" : "back.out(2)", stagger: 0.12, immediateRender: false }, at + 0.25);
    },
  };
}
