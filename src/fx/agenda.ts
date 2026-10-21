import { gsap } from "gsap";
import type { Ctx, Part, StepAdder } from "../types";

export type AgendaRow = Extract<Part, { kind: "agenda" }>["rows"][number];
export interface AgendaOpts {
  rows: AgendaRow[];
  x: number;
  y: number;
  w: number;
  h?: number; // with h, the rows shrink to fit it, down to the floor, then report a problem
  current?: string; // a row title; default: the row marked current
}
export interface AgendaHandle {
  show: StepAdder;
  move: (tl: gsap.core.Timeline, toRow: number, at?: number) => void; // toRow counts from 0
  el: HTMLElement; // the root
  rows: HTMLElement[]; // one element per row, in order
}

const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 40;
const GAP = 18; // between rows

// Times in a right-aligned column. Past rows are --k-muted, the current row --k-accent with a marker bar
// that slides down from the first row, future rows --k-fg. move slides the marker and the colours to another row.
export function agenda(ctx: Ctx, opts: AgendaOpts): AgendaHandle {
  const title = opts.current ?? opts.rows.find((r) => r.current)?.title;
  let cur = title === undefined ? -1 : opts.rows.findIndex((r) => r.title === title);
  if (title !== undefined && cur < 0) ctx.problem(`agenda: no row "${title}"`);
  const colorOf = (i: number, c: number) => (c < 0 || i > c ? "var(--k-fg)" : i === c ? "var(--k-accent)" : "var(--k-muted)");
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, boxSizing: "border-box", paddingLeft: "28px",
    display: "flex", flexDirection: "column", gap: `${GAP}px`, font: `600 ${MAX_FONT}px/1.25 var(--k-font)`, zIndex: "2",
  });
  const rows = opts.rows.map((r, i) => {
    const el = root.appendChild(document.createElement("div"));
    Object.assign(el.style, { display: "flex", gap: "28px", color: colorOf(i, cur) });
    const time = el.appendChild(document.createElement("div"));
    time.textContent = `${r.from}–${r.to}`;
    Object.assign(time.style, { flex: "none", width: "7em", textAlign: "right", fontVariantNumeric: "tabular-nums" });
    const text = el.appendChild(document.createElement("div"));
    text.textContent = r.title;
    Object.assign(text.style, { minWidth: "0", overflowWrap: "anywhere" });
    return el;
  });
  const bar = root.appendChild(document.createElement("div"));
  Object.assign(bar.style, { position: "absolute", left: "0", width: "8px", borderRadius: "4px", background: "var(--k-accent)" });
  ctx.html.append(root);
  gsap.set([root, bar], { autoAlpha: 0 });

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
    if (!fits) ctx.problem(`agenda: ${rows.length} rows do not fit ${opts.h}px at ${FLOOR}px text`);
    return fits;
  };

  let anchor = -1; // the row the bar's top sits on; moves shift the bar by y from there
  const dy = (i: number) => rows[i].offsetTop - rows[anchor].offsetTop;

  return {
    el: root,
    rows,
    show: (tl) => {
      const at = tl.duration();
      if (!fit()) return void tl.set({}, {}, at + 0.4);
      tl.to(root, { autoAlpha: 1, duration: 0.5 }, at);
      if (cur < 0) return;
      anchor = cur;
      const [first, row] = [rows[0], rows[cur]];
      Object.assign(bar.style, { top: `${row.offsetTop}px`, height: `${row.offsetHeight}px` });
      tl.set(bar, { autoAlpha: 1, immediateRender: false }, at + 0.5);
      tl.fromTo(bar, { y: first.offsetTop - row.offsetTop }, { y: 0, duration: 0.7, ease: "power2.inOut" }, at + 0.5);
    },
    move: (tl, to, at = tl.duration()) => {
      if (!rows[to]) ctx.problem(`agenda: no row ${to}`);
      if (!rows[to] || !fit()) return void tl.set({}, {}, at + 0.7);
      const from = cur;
      cur = to;
      if (anchor < 0) {
        anchor = to;
        Object.assign(bar.style, { top: `${rows[to].offsetTop}px`, height: `${rows[to].offsetHeight}px` });
        tl.set(bar, { autoAlpha: 1, immediateRender: false }, at);
      } else {
        const [a, b] = [rows[from], rows[to]];
        tl.fromTo(bar, { y: dy(from), height: a.offsetHeight }, { y: dy(to), height: b.offsetHeight, duration: 0.7, ease: "power2.inOut", immediateRender: false }, at);
      }
      rows.forEach((r, i) => {
        if (colorOf(i, from) !== colorOf(i, to)) tl.set(r, { color: colorOf(i, to), immediateRender: false }, at + 0.35);
      });
    },
  };
}
