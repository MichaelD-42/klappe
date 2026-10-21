import { gsap } from "gsap";
import { drawOn } from "./draw";
import type { Ctx, StepAdder } from "../types";

export interface ChecklistOpts {
  items: { text: string; done?: boolean }[];
  x: number;
  y: number;
  w: number;
  h?: number; // with h, the list shrinks to fit it, down to the floor, then reports a problem
}
export interface ChecklistHandle {
  show: StepAdder;
  tick(i: number): StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 40;
const BOX = 32;
const GAP = 20; // between rows

// Square boxes with a 2 px --k-line stroke; tick(i) draws the check in --k-ok, brightens the text to --k-fg
// and lights the box in --k-accent until the next tick.
export function checklist(ctx: Ctx, opts: ChecklistOpts): ChecklistHandle {
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, display: "flex", flexDirection: "column",
    gap: `${GAP}px`, font: `600 ${MAX_FONT}px/1.25 var(--k-font)`, zIndex: "2",
  });
  const rows = opts.items.map((it) => {
    const row = root.appendChild(document.createElement("div"));
    Object.assign(row.style, { display: "flex", alignItems: "flex-start", gap: "20px" });
    const svg = row.appendChild(document.createElementNS(SVG, "svg"));
    svg.setAttribute("viewBox", `0 0 ${BOX} ${BOX}`);
    Object.assign(svg.style, { width: `${BOX}px`, height: `${BOX}px`, flex: "none", marginTop: "0.125em", overflow: "visible" });
    const box = svg.appendChild(document.createElementNS(SVG, "rect"));
    for (const [k, v] of Object.entries({ x: 1, y: 1, width: BOX - 2, height: BOX - 2, rx: 4 })) box.setAttribute(k, String(v));
    Object.assign(box.style, { fill: "none", stroke: "var(--k-line)", strokeWidth: "2" });
    const mark = svg.appendChild(document.createElementNS(SVG, "path"));
    mark.setAttribute("d", "M7 17 L14 24 L26 8");
    Object.assign(mark.style, { fill: "none", stroke: "var(--k-ok)", strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round" });
    gsap.set(mark, { autoAlpha: 0 });
    const text = row.appendChild(document.createElement("div"));
    text.textContent = it.text;
    Object.assign(text.style, { minWidth: "0", overflowWrap: "anywhere", color: it.done ? "var(--k-fg)" : "var(--k-muted)" });
    return { row, box, mark, text, done: !!it.done };
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
    if (!fits) ctx.problem(`checklist: ${rows.length} items do not fit ${opts.h}px at ${FLOOR}px text`);
    return fits;
  };

  let last = -1; // the item the previous tick lit; it settles when the next tick starts
  return {
    show: (tl) => {
      const at = tl.duration();
      if (!fit()) return void tl.set({}, {}, at + 0.4);
      tl.to(root, { autoAlpha: 1, duration: 0.4 }, at);
      rows.forEach((r, i) => {
        if (!r.done) return;
        tl.set(r.mark, { autoAlpha: 1, immediateRender: false }, at + 0.4);
        drawOn(r.mark, { duration: 0.4, each: 0, at: at + 0.4 + i * 0.1 })(tl);
      });
    },
    tick(i) {
      const r = rows[i];
      if (!r) ctx.problem(`checklist: no item ${i}`);
      const prev = last;
      last = i;
      return (tl) => {
        const at = tl.duration();
        if (!r || !fit()) return void tl.set({}, {}, at + 0.4);
        const set = (el: Element, vars: gsap.TweenVars, t = at) => tl.set(el, { ...vars, immediateRender: false }, t);
        if (rows[prev]) set(rows[prev].box, { stroke: "var(--k-line)" });
        set(r.box, { stroke: "var(--k-accent)" });
        set(r.mark, { autoAlpha: 1 });
        drawOn(r.mark, { duration: 0.5, each: 0, at })(tl);
        set(r.text, { color: "var(--k-fg)" }, at + 0.25);
      };
    },
  };
}
