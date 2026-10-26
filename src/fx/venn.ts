import { gsap } from "gsap";
import { MARKER_MIX } from "./annotate";
import { drawOn } from "./draw";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export type VennOpts = {
  sets: { id: string; label: string }[]; // two or three circles
  regions?: Record<string, string>; // a label per region, keyed by its set ids joined with "+": { "a+b": "Both" }
} & Rect;
export interface VennHandle {
  show: StepAdder;
  light(...ids: string[]): StepAdder;
}
type P = { x: number; y: number };
type Circle = P & { r: number };

const SVG = "http://www.w3.org/2000/svg";
const NAME_H = 48; // the band above (and below) the circles for the set names
const NAME_FONT = 26;
const REGION_FONT = 22;
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const FILL = `color-mix(in srgb, var(--k-accent) ${MARKER_MIX * 100}%, transparent)`;
let clips = 0;

// The circles (centres one radius apart, so every overlap is wide), each set name's anchor (above a circle in
// the upper row, below one in the lower row) and a label point in each region, keyed by its set indexes ("0+1").
export function vennLayout(rect: Rect, n: 2 | 3): { circles: Circle[]; names: (P & { above: boolean })[]; regions: Record<string, P> } {
  const box = { x: rect.x, y: rect.y + NAME_H, w: rect.w, h: rect.h - 2 * NAME_H };
  // Two side by side span 3r × 2r; three (two above, one below) 3r × (2 + √3/2)r.
  const r = n === 2 ? Math.min(box.w / 3, box.h / 2) : Math.min(box.w / 3, box.h / (2 + Math.sqrt(3) / 2));
  const [cx, cy] = [box.x + box.w / 2, box.y + box.h / 2];
  const dy = (Math.sqrt(3) / 2) * r;
  const circles: Circle[] = n === 2
    ? [{ x: cx - r / 2, y: cy, r }, { x: cx + r / 2, y: cy, r }]
    : [{ x: cx - r / 2, y: cy - dy / 2, r }, { x: cx + r / 2, y: cy - dy / 2, r }, { x: cx, y: cy + dy / 2, r }];
  const mid = (ps: P[]) => ({ x: ps.reduce((s, p) => s + p.x, 0) / ps.length, y: ps.reduce((s, p) => s + p.y, 0) / ps.length });
  const centre = mid(circles);
  const away = (p: P, from: P, by: number) => {
    const [vx, vy] = [p.x - from.x, p.y - from.y];
    const d = Math.hypot(vx, vy) || 1;
    return { x: p.x + (vx / d) * by, y: p.y + (vy / d) * by };
  };
  const names = circles.map((c) => ({ x: c.x, y: c.y <= centre.y ? c.y - r : c.y + r, above: c.y <= centre.y }));
  const regions: Record<string, P> = {};
  const idx = circles.map((_, i) => i);
  for (let m = 1; m < 1 << n; m++) {
    const inn = idx.filter((i) => m & (1 << i));
    const out = idx.filter((i) => !(m & (1 << i)));
    // In all the circles: the centre. Otherwise the middle of the IN centres, pushed away from the OUT ones.
    const p = out.length === 0 ? centre : away(mid(inn.map((i) => circles[i])), mid(out.map((i) => circles[i])), inn.length === 1 ? r / 2 : 0.4 * r);
    regions[inn.join("+")] = p;
  }
  return { circles, names, regions };
}

// Two or three overlapping circles with names; each region (in exactly the named sets) lights up in a step.
export function venn(ctx: Ctx, opts: VennOpts): VennHandle {
  const n = opts.sets.length;
  if (n !== 2 && n !== 3) throw new Error(`venn: 2 or 3 sets, not ${n}`);
  const ids = opts.sets.map((s) => s.id);
  if (new Set(ids).size !== n) throw new Error("venn: set ids repeat");
  const { circles, names, regions } = vennLayout(opts, n);
  // A region's key in set order, from ids in any order.
  const keyOf = (list: string[]) => {
    for (const id of list) if (!ids.includes(id)) throw new Error(`venn: unknown set "${id}"`);
    if (!list.length) throw new Error("venn: a region needs a set");
    return ids.filter((id) => list.includes(id)).join("+");
  };
  const el = (tag: string, attrs: Record<string, string | number>, parent: Element = ctx.svg) => {
    const e = parent.appendChild(document.createElementNS(SVG, tag));
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
    return e;
  };
  const ring = (c: Circle) => `M ${c.x - c.r} ${c.y} a ${c.r} ${c.r} 0 1 0 ${2 * c.r} 0 a ${c.r} ${c.r} 0 1 0 ${-2 * c.r} 0 Z`;

  // Per circle, a clip to its inside and one to its outside (the rect less the circle, even-odd).
  const uid = `k-venn-${++clips}`;
  const defs = el("defs", {});
  const around = `M ${opts.x - 8} ${opts.y - 8} h ${opts.w + 16} v ${opts.h + 16} h ${-opts.w - 16} Z `;
  circles.forEach((c, i) => {
    el("path", { d: ring(c) }, el("clipPath", { id: `${uid}-in-${i}`, clipPathUnits: "userSpaceOnUse" }, defs));
    el("path", { d: around + ring(c), "clip-rule": "evenodd" }, el("clipPath", { id: `${uid}-out-${i}`, clipPathUnits: "userSpaceOnUse" }, defs));
  });
  // One fill per region, nested in a clip per circle: an exact region however the circles overlap.
  const fills = new Map<string, SVGGElement>();
  for (let m = 1; m < 1 << n; m++) {
    const key = ids.filter((_, i) => m & (1 << i)).join("+");
    const outer = el("g", { "data-k-venn-region": key }) as SVGGElement;
    let g: Element = outer;
    circles.forEach((_, i) => (g = el("g", { "clip-path": `url(#${uid}-${m & (1 << i) ? "in" : "out"}-${i})` }, g)));
    const first = circles[Math.log2(m & -m)];
    el("rect", { x: first.x - first.r, y: first.y - first.r, width: 2 * first.r, height: 2 * first.r }, g).setAttribute("style", `fill: ${FILL}`);
    gsap.set(outer, { autoAlpha: 0 });
    fills.set(key, outer);
  }
  // The outlines, above the fills.
  const outlines = circles.map((c, i) => {
    const p = el("path", { d: ring(c), "data-k-venn-set": ids[i] });
    Object.assign((p as SVGElement).style, { fill: "none", stroke: "var(--k-line)", strokeWidth: "4" });
    gsap.set(p, { autoAlpha: 0 });
    return p;
  });

  const label = (p: P, text: string, style: Partial<CSSStyleDeclaration>, w: number) => {
    const d = ctx.html.appendChild(document.createElement("div"));
    d.textContent = text;
    Object.assign(d.style, { position: "absolute", left: `${p.x - w / 2}px`, width: `${w}px`, textAlign: "center", color: "var(--k-fg)", overflowWrap: "anywhere", ...style });
    gsap.set(d, { autoAlpha: 0 });
    return d;
  };
  const r = circles[0].r;
  const nameEls = names.map((p, i) =>
    label(p, opts.sets[i].label, { font: `700 ${NAME_FONT}px/1.2 var(--k-font)`, whiteSpace: "nowrap", top: `${p.above ? p.y - 8 : p.y + 8}px`, transform: p.above ? "translateY(-100%)" : "none" }, 2 * r),
  );
  const regionEls = new Map<string, HTMLElement>();
  for (const [k, text] of Object.entries(opts.regions ?? {})) {
    const key = keyOf(k.split("+"));
    const p = regions[key.split("+").map((id) => ids.indexOf(id)).join("+")];
    const e = label(p, text, { font: `600 ${REGION_FONT}px/1.2 var(--k-font)`, top: `${p.y}px`, transform: "translateY(-50%)" }, 0.6 * r);
    e.setAttribute("data-k-venn-label", key);
    regionEls.set(key, e);
  }

  // Text is fitted on first use: the layout exists by then, not while building. A name keeps one line, a region
  // label two.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    const shrink = (el: HTMLElement, max: number, lines: number, msg: string) => {
      const over = () => el.offsetHeight > 1.2 * parseFloat(el.style.fontSize) * lines + 1 || el.scrollWidth > el.clientWidth;
      let size = max;
      for (; size > FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      el.style.fontSize = `${size}px`;
      if (over()) ctx.problem(msg);
    };
    nameEls.forEach((el, i) => shrink(el, NAME_FONT, 1, `venn: name of set "${ids[i]}" too long`));
    for (const [key, el] of regionEls) shrink(el, REGION_FONT, 2, `venn: label of region "${key}" too long`);
  };

  let lit: string | undefined; // the region lit by the latest light(), until the next one
  const labelled = new Set<string>(); // regions whose label shows already: it stays once shown
  return {
    show(tl) {
      fit();
      const t = tl.duration();
      if (ctx.reducedMotion) tl.to(outlines, { autoAlpha: 1, duration: motion.step }, t);
      else {
        outlines.forEach((o) => tl.set(o, { autoAlpha: 1 }, t));
        drawOn(outlines, { duration: 0.8, each: 0.15, at: t })(tl);
      }
      tl.to(nameEls, { autoAlpha: 1, duration: 0.4 }, t + 0.4);
    },
    light(...list) {
      const key = keyOf(list);
      // Which region settles is decided when the step is added, not here: adders built out of step order still settle in step order.
      return (tl) => {
        fit();
        const prev = lit;
        lit = key;
        const seen = labelled.has(key);
        labelled.add(key);
        const t = tl.duration();
        if (prev === key) return void tl.set({}, {}, t + motion.step);
        if (prev) tl.fromTo(fills.get(prev)!, { autoAlpha: 1 }, { autoAlpha: 0, duration: motion.step, immediateRender: false }, t);
        tl.fromTo(fills.get(key)!, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false }, t);
        const lab = regionEls.get(key);
        if (lab && !seen) tl.fromTo(lab, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false }, t);
      };
    },
  };
}
