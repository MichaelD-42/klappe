import { gsap } from "gsap";
import { drawOn } from "./draw";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export type Quadrant = "tl" | "tr" | "bl" | "br";
export type MatrixOpts = {
  axes: { x: string; y: string };
  quadrants?: Partial<Record<Quadrant, string>>;
  items: { id: string; label: string }[];
} & Rect;
export interface MatrixHandle {
  show: StepAdder;
  place(id: string, at: Quadrant | { x: number; y: number }): StepAdder; // a quadrant's next slot, or a 0-to-1 score (y up)
}

const SVG = "http://www.w3.org/2000/svg";
const QUADS: Quadrant[] = ["tl", "tr", "bl", "br"];
const GUTTER = 56; // left of the plot for the y title, below it for the x title
const NAME_H = 48; // the band at the top of a quadrant for its name
const PAD = 16;
const NAME_X = 2 * PAD; // the inset of quadrant names and slot columns from the quadrant sides, clear of the y arrowhead
const CHIP_H = 64;
const COLS = 2;
const ARROW = 20;
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 26;
const NAME_FONT = 24;
const AXIS_FONT = 26;
const LINE_H = 1.2;

const r2 = (n: number) => Math.round(n * 100) / 100;

// The plot (the rect less the axis-title gutters), its four quadrants, and each quadrant's item slots,
// two columns filled row by row below the quadrant's name band.
export function matrixLayout(rect: Rect): { plot: Rect; quads: Record<Quadrant, Rect>; slots: Record<Quadrant, Rect[]> } {
  const plot = { x: rect.x + GUTTER, y: rect.y, w: rect.w - GUTTER, h: rect.h - GUTTER };
  const [qw, qh] = [plot.w / 2, plot.h / 2];
  const quad = (q: Quadrant) => ({ x: plot.x + (q[1] === "r" ? qw : 0), y: plot.y + (q[0] === "b" ? qh : 0), w: qw, h: qh });
  const quads = Object.fromEntries(QUADS.map((q) => [q, quad(q)])) as Record<Quadrant, Rect>;
  const cw = (qw - 2 * NAME_X - (COLS - 1) * PAD) / COLS;
  const rows = Math.max(0, Math.floor((qh - NAME_H - PAD) / (CHIP_H + PAD)));
  const slots = Object.fromEntries(
    QUADS.map((q) => {
      const b = quads[q];
      const list = Array.from({ length: rows * COLS }, (_, k) => ({
        x: r2(b.x + NAME_X + (k % COLS) * (cw + PAD)), y: r2(b.y + NAME_H + Math.floor(k / COLS) * (CHIP_H + PAD)), w: r2(cw), h: CHIP_H,
      }));
      return [q, list];
    }),
  ) as Record<Quadrant, Rect[]>;
  return { plot, quads, slots };
}

// A 2×2: two axes with titles, optional quadrant names, items placed in a quadrant and moved to another step by step.
export function matrix(ctx: Ctx, opts: MatrixOpts): MatrixHandle {
  const { plot, quads, slots } = matrixLayout(opts);
  const div = (style: Partial<CSSStyleDeclaration>, text: string) => {
    const el = document.createElement("div");
    Object.assign(el.style, { position: "absolute", boxSizing: "border-box", ...style });
    const inner = el.appendChild(document.createElement("div"));
    inner.textContent = text;
    Object.assign(inner.style, { overflowWrap: "anywhere", maxWidth: "100%" });
    ctx.html.append(el);
    gsap.set(el, { autoAlpha: 0 });
    return { el, text: inner };
  };

  // Axes (with arrowheads at their high ends) along the left and bottom; thinner dividers through the middle.
  const [bottom, right, mx, my] = [plot.y + plot.h, plot.x + plot.w, plot.x + plot.w / 2, plot.y + plot.h / 2];
  const path = (d: string, style: Partial<CSSStyleDeclaration>) => {
    const p = document.createElementNS(SVG, "path");
    p.setAttribute("d", d);
    Object.assign(p.style, style);
    ctx.svg.append(p);
    gsap.set(p, { autoAlpha: 0 });
    return p;
  };
  const stroke = (w: number) => ({ fill: "none", stroke: "var(--k-line)", strokeWidth: String(w), strokeLinecap: "round" });
  const lines = [
    path(`M ${plot.x} ${bottom} L ${plot.x} ${plot.y + ARROW}`, stroke(4)),
    path(`M ${plot.x} ${bottom} L ${right - ARROW} ${bottom}`, stroke(4)),
    path(`M ${mx} ${plot.y} L ${mx} ${bottom}`, stroke(2)),
    path(`M ${plot.x} ${my} L ${right} ${my}`, stroke(2)),
  ];
  const heads = [
    path(`M ${plot.x} ${plot.y} L ${plot.x - 11} ${plot.y + ARROW} L ${plot.x + 11} ${plot.y + ARROW} Z`, { fill: "var(--k-line)" }),
    path(`M ${right} ${bottom} L ${right - ARROW} ${bottom - 11} L ${right - ARROW} ${bottom + 11} Z`, { fill: "var(--k-line)" }),
  ];
  const axisFont = `700 ${AXIS_FONT}px/${LINE_H} var(--k-font)`;
  const titles = [
    div({ left: `${plot.x}px`, top: `${bottom + 8}px`, width: `${plot.w}px`, textAlign: "center", color: "var(--k-fg)", font: axisFont }, opts.axes.x),
    // Vertical, reading bottom to top.
    div({
      left: `${opts.x}px`, top: `${plot.y}px`, width: `${GUTTER - 12}px`, height: `${plot.h}px`, display: "flex", alignItems: "center", justifyContent: "center",
      writingMode: "vertical-rl", transform: "rotate(180deg)", color: "var(--k-fg)", font: axisFont,
    }, opts.axes.y),
  ];
  const names = QUADS.filter((q) => opts.quadrants?.[q]).map((q) => {
    const b = quads[q];
    return [q, div({
      left: `${b.x + NAME_X}px`, top: `${b.y + 8}px`, width: `${b.w - 2 * NAME_X}px`, height: `${NAME_H - 8}px`, whiteSpace: "nowrap",
      textAlign: q[1] === "r" ? "right" : "left", color: "var(--k-muted)", font: `600 ${NAME_FONT}px/${LINE_H} var(--k-font)`,
    }, opts.quadrants![q]!)] as const;
  });

  const chip = slots.tl[0] ?? { w: 0, h: CHIP_H };
  const items = new Map(opts.items.map((it) => {
    const c = div({
      left: "0", top: "0", width: `${chip.w}px`, height: `${chip.h}px`, padding: "4px 12px", border: "2px solid var(--k-line)", borderRadius: "12px",
      outline: "2px solid transparent", // in the accent during its step: 4 px of accent in all, with no change to the layout
      background: "var(--k-surface)", color: "var(--k-fg)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
      font: `600 ${MAX_FONT}px/${LINE_H} var(--k-font)`, zIndex: "2",
    }, it.label);
    c.el.setAttribute("data-k-matrix-item", it.id);
    gsap.set(c.el, { x: 0, y: 0 }); // so play and a seek back past its first place() leave the same transform

    return [it.id, c] as const;
  }));

  // Labels are fitted on first use: the layout exists by then, not while building.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    // A vertical title's lines stack sideways: its width counts them.
    const shrink = (el: HTMLElement, text: HTMLElement, max: number, n: number, msg: string, vertical = false) => {
      let size = max;
      const over = () =>
        vertical
          ? text.scrollWidth > LINE_H * size * n + 1
          : text.offsetHeight > LINE_H * size * n + 1 || text.offsetHeight > el.clientHeight || text.scrollWidth > text.clientWidth;
      for (; size > FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      el.style.fontSize = `${size}px`;
      if (over()) ctx.problem(msg);
    };
    titles.forEach(({ el, text }, i) => shrink(el, text, AXIS_FONT, 1, `matrix: ${i ? "y" : "x"} axis title too long`, i === 1));
    for (const [q, { el, text }] of names) shrink(el, text, NAME_FONT, 1, `matrix: name of quadrant "${q}" too long`);
    for (const [id, { el, text }] of items) shrink(el, text, MAX_FONT, 2, `matrix: label of "${id}" too long`);
  };

  // A slot in a quadrant, or a point (p) that takes no slot.
  const where = new Map<string, { q?: Quadrant; k: number; p?: { x: number; y: number } }>();
  let last: string | undefined; // the item placed by the latest place(), in the accent until the next one

  return {
    show(tl) {
      fit();
      const t = tl.duration();
      lines.forEach((l) => tl.set(l, { autoAlpha: 1 }, t));
      drawOn(lines, { duration: 0.6, each: 0.1, at: t })(tl);
      tl.to(heads, { autoAlpha: 1, duration: 0.2 }, t + 0.5);
      tl.to([...titles.map((t) => t.el), ...names.map(([, n]) => n.el)], { autoAlpha: 1, duration: 0.4 }, t + 0.4);
    },
    place(id, at) {
      const item = items.get(id);
      if (!item) throw new Error(`matrix: unknown item "${id}"`);
      if (typeof at === "object") {
        if (![at.x, at.y].every((v) => v >= 0 && v <= 1)) throw new Error(`matrix: place "${id}" at x ${at.x}, y ${at.y}; both run from 0 to 1`);
        // Centred on the score, kept inside the plot.
        const s = {
          x: Math.min(Math.max(plot.x + at.x * plot.w - chip.w / 2, plot.x), plot.x + plot.w - chip.w),
          y: Math.min(Math.max(plot.y + (1 - at.y) * plot.h - chip.h / 2, plot.y), plot.y + plot.h - chip.h),
        };
        return (tl) => {
          const from = where.get(id);
          const prev = last;
          where.set(id, { k: -1, p: at });
          last = id;
          fit();
          const t = tl.duration();
          if (prev && prev !== id) tl.set(items.get(prev)!.el, { borderColor: "var(--k-line)", outlineColor: "transparent", zIndex: 2, immediateRender: false }, t);
          tl.set(item.el, { borderColor: "var(--k-accent)", outlineColor: "var(--k-accent)", zIndex: 3, immediateRender: false }, t);
          if (!from) tl.fromTo(item.el, { ...s, autoAlpha: 0 }, { ...s, autoAlpha: 1, duration: 0.4, immediateRender: false }, t);
          else if (from.p?.x !== at.x || from.p?.y !== at.y) tl.to(item.el, { ...s, duration: motion.step, ease: "power2.inOut" }, t);
          else tl.set({}, {}, t + 0.4);
        };
      }
      const q = at;
      if (!QUADS.includes(q)) throw new Error(`matrix: unknown quadrant "${q}"`);
      // The slot is picked when the step is added, not here: adders built out of step order still place in step order.
      return (tl) => {
        const from = where.get(id);
        const prev = last;
        let to = from;
        if (from?.q !== q) {
          const taken = new Set([...where].filter(([o, w]) => o !== id && w.q === q).map(([, w]) => w.k));
          let k = 0;
          while (taken.has(k)) k++;
          if (k >= slots[q].length) {
            ctx.problem(`matrix: quadrant "${q}" is full`);
            k = Math.max(0, slots[q].length - 1); // shortcut: overlaps the last slot; a bigger rect is the fix
          }
          to = { q, k };
          where.set(id, to);
        }
        last = id;
        const s = slots[q][to!.k] ?? quads[q];
        fit();
        const t = tl.duration();
        // The previous item settles as this one starts (sets, so they seek).
        if (prev && prev !== id) tl.set(items.get(prev)!.el, { borderColor: "var(--k-line)", outlineColor: "transparent", zIndex: 2, immediateRender: false }, t);
        tl.set(item.el, { borderColor: "var(--k-accent)", outlineColor: "var(--k-accent)", zIndex: 3, immediateRender: false }, t);
        if (!from) tl.fromTo(item.el, { x: s.x, y: s.y, autoAlpha: 0 }, { x: s.x, y: s.y, autoAlpha: 1, duration: 0.4, immediateRender: false }, t);
        else if (from.q !== q) tl.to(item.el, { x: s.x, y: s.y, duration: motion.step, ease: "power2.inOut" }, t);
        else tl.set({}, {}, t + 0.4);
      };
    },
  };
}
