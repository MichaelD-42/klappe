import { gsap } from "gsap";
import { drawOn, typeSize } from "./draw";
import { gapCss, strokeW } from "./layout";
import type { Ctx, StepAdder } from "../types";

export interface ChecklistOpts {
  items: { text: string; done?: boolean }[];
  x: number;
  y: number;
  w: number;
  h?: number; // with h, the list shrinks to fit it, down to the floor, then reports a problem
}
export interface ChecklistHandle {
  el: HTMLElement; // the list's block, for a scene that places or moves it
  show: StepAdder;
  tick(i: number): StepAdder;
  fail(i: number): StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 40;
const BOX = 32;
const GAP = 20; // between rows

// Square boxes with a 2 px --k-line stroke; tick(i) draws the check in --k-ok, brightens the text to --k-fg
// and lights the box in --k-accent until the next tick. A done item's check already drew in show, so tick does not redraw it.
// fail(i) does the same with a cross in --k-bad, and takes a done item's check away.
export function checklist(ctx: Ctx, opts: ChecklistOpts): ChecklistHandle {
  const root = document.createElement("div");
  Object.assign(root.style, {
    position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${opts.w}px`, display: "flex", flexDirection: "column",
    gap: gapCss(GAP), font: `600 ${typeSize("body", MAX_FONT)}px/1.25 var(--k-font)`, zIndex: "2",
  });
  const rows = opts.items.map((it) => {
    const row = root.appendChild(document.createElement("div"));
    Object.assign(row.style, { display: "flex", alignItems: "flex-start", gap: "20px" });
    const svg = row.appendChild(document.createElementNS(SVG, "svg"));
    svg.setAttribute("viewBox", `0 0 ${BOX} ${BOX}`);
    Object.assign(svg.style, { width: `${BOX}px`, height: `${BOX}px`, flex: "none", marginTop: "0.125em", overflow: "visible" });
    const box = svg.appendChild(document.createElementNS(SVG, "rect"));
    for (const [k, v] of Object.entries({ x: 1, y: 1, width: BOX - 2, height: BOX - 2, rx: 4 })) box.setAttribute(k, String(v));
    Object.assign(box.style, { fill: "none", stroke: "var(--k-line)", strokeWidth: strokeW(2) });
    const mark = svg.appendChild(document.createElementNS(SVG, "path"));
    mark.setAttribute("d", "M7 17 L14 24 L26 8");
    Object.assign(mark.style, { fill: "none", stroke: "var(--k-ok)", strokeWidth: strokeW(4), strokeLinecap: "round", strokeLinejoin: "round" });
    const cross = svg.appendChild(document.createElementNS(SVG, "path"));
    cross.setAttribute("d", "M9 9 L23 23 M23 9 L9 23");
    Object.assign(cross.style, { fill: "none", stroke: "var(--k-bad)", strokeWidth: strokeW(4), strokeLinecap: "round" });
    gsap.set([mark, cross], { autoAlpha: 0 });
    const text = row.appendChild(document.createElement("div"));
    text.textContent = it.text;
    Object.assign(text.style, { minWidth: "0", overflowWrap: "anywhere", color: it.done ? "var(--k-fg)" : "var(--k-muted)" });
    return { row, box, mark, cross, text, done: !!it.done };
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
    if (!fits) ctx.problem(`checklist: ${rows.length} items do not fit ${opts.h}px at ${FLOOR}px text`);
    return fits;
  };

  let last = -1; // the item the previous tick lit; it settles when the next tick starts
  const mark = (i: number, failed: boolean): StepAdder => {
    const r = rows[i];
    if (!r) ctx.problem(`checklist: no item ${i}`);
    return (tl) => {
      const at = tl.duration();
      if (!r || !fit()) return void tl.set({}, {}, at + 0.4);
      const prev = last; // step-order state, so adders made out of step order still light the latest tick
      last = i;
      const set = (el: Element, vars: gsap.TweenVars, t = at) => tl.set(el, { ...vars, immediateRender: false }, t);
      if (rows[prev]) set(rows[prev].box, { stroke: "var(--k-line)" });
      set(r.box, { stroke: "var(--k-accent)" });
      if (failed) {
        if (r.done) set(r.mark, { autoAlpha: 0 });
        set(r.cross, { autoAlpha: 1 });
        drawOn(r.cross, { duration: 0.5, each: 0, at })(tl);
      } else if (!r.done) {
        set(r.mark, { autoAlpha: 1 });
        drawOn(r.mark, { duration: 0.5, each: 0, at })(tl);
      }
      set(r.text, { color: "var(--k-fg)" }, at + 0.25);
    };
  };
  return {
    el: root,
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
    tick: (i) => mark(i, false),
    fail: (i) => mark(i, true),
  };
}
