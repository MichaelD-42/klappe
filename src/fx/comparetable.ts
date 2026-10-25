import { gsap } from "gsap";
import type { IconNode } from "lucide";
import { t } from "../strings";
import type { Ctx, StepAdder } from "../types";
import { iconGlyph } from "./icons";

export interface CompareTableOpts {
  columns: string[]; // the header of each value column, e.g. the products compared
  rows: { label: string; cells: (boolean | string)[] }[]; // true: a tick, false: a cross, a string: that text
  x: number;
  y: number;
  w: number;
  h?: number; // with h, the table shrinks to fit it, down to the floor, then reports a problem
}
export interface CompareTableHandle {
  el: HTMLElement; // the table's block, for a scene that places or moves it
  show: StepAdder; // the header and the grid lines; the rows stay hidden
  row(i: number): StepAdder;
}

// Lucide "check" and "x" (ISC), inline: src/fx is not scanned for icon names, and importing "lucide" would pull every icon in dev.
const CHECK: IconNode = [["path", { d: "M20 6 9 17l-5-5" }]];
const CROSS: IconNode = [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]];
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 36;

const div = (parent: HTMLElement, style: Partial<CSSStyleDeclaration>, text?: string) => {
  const e = parent.appendChild(document.createElement("div"));
  Object.assign(e.style, style);
  if (text !== undefined) e.textContent = text;
  return e;
};

// A feature matrix: a header in --k-muted, then one row per step. row(i) fades the row in, lands its ticks (--k-ok) and
// crosses (--k-bad) cell by cell, and lights its label in --k-accent until the next row step settles it to --k-fg.
// Reduced motion: the marks fade in without the pop.
export function compareTable(ctx: Ctx, opts: CompareTableOpts): CompareTableHandle {
  const cols = opts.columns.length;
  const grid = { display: "grid", gridTemplateColumns: `minmax(0, 2fr) repeat(${cols}, minmax(0, 1fr))`, columnGap: "24px", alignItems: "center" };
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, display: "flex", flexDirection: "column",
    font: `600 ${MAX_FONT}px/1.25 var(--k-font)`, color: "var(--k-fg)", zIndex: "2",
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
      if (typeof c === "string") return void (cell.textContent = c);
      const mark = div(cell, { display: "inline-block", width: "1.2em", height: "1.2em", verticalAlign: "middle", color: c ? "var(--k-ok)" : "var(--k-bad)" });
      mark.setAttribute("role", "img");
      mark.setAttribute("aria-label", t(c ? "yes" : "no", ctx.deck.lang));
      mark.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${iconGlyph(c ? CHECK : CROSS, ctx.problem)}</svg>`;
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
    let size = MAX_FONT;
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

  let last = -1; // the row the previous row step lit; set while the timeline is built, so adders may be made in any order
  return {
    el: root,
    show: (tl) => {
      const at = tl.duration();
      if (!fit()) return void tl.set({}, {}, at + 0.4);
      tl.to(root, { autoAlpha: 1, duration: 0.4 }, at);
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
