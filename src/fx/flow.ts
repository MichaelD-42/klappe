import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { iconGlyph } from "./icons";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

gsap.registerPlugin(MotionPathPlugin);

export interface FlowOpts {
  nodes: { id: string; label: string; col: number; row: number; icon?: string }[];
  edges: { from: string; to: string; label?: string }[];
  grid: Rect & { cols: number; rows: number };
}
export interface FlowHandle {
  show(ids?: string[]): StepAdder;
  highlight(ids: string[]): StepAdder;
  send(o: { path: string[]; count?: number; label?: string }): StepAdder;
  node(id: string): Element;
}

const SVG = "http://www.w3.org/2000/svg";
const FILL = 0.7; // a node fills this share of its cell
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 32;
const MAX_LINES = 3;
const LINE_H = 1.2;
const GAP = 0.25; // seconds between packets
const WAIT = 0.3; // seconds a packet rests at a node
let markers = 0;

const r2 = (n: number) => Math.round(n * 100) / 100;

// The corner points of the orthogonal route from box a to box b: horizontal out, vertical, horizontal in;
// a straight line when the centres share a row or a column. Points sit on the box edges (zero-size boxes: centres).
function edgePoints(a: Rect, b: Rect): { x: number; y: number }[] {
  const [ax, ay, bx, by] = [a.x + a.w / 2, a.y + a.h / 2, b.x + b.w / 2, b.y + b.h / 2];
  if (ay === by) {
    const s = bx >= ax ? 1 : -1;
    return [{ x: ax + (s * a.w) / 2, y: ay }, { x: bx - (s * b.w) / 2, y: by }];
  }
  if (ax === bx) {
    const s = by >= ay ? 1 : -1;
    return [{ x: ax, y: ay + (s * a.h) / 2 }, { x: bx, y: by - (s * b.h) / 2 }];
  }
  const s = bx > ax ? 1 : -1;
  const mx = (ax + s * a.w / 2 + bx - s * b.w / 2) / 2;
  return [{ x: ax + (s * a.w) / 2, y: ay }, { x: mx, y: ay }, { x: mx, y: by }, { x: bx - (s * b.w) / 2, y: by }];
}

// The SVG path data of that route: "M x y L x y …".
export function edgePath(a: Rect, b: Rect): string {
  return edgePoints(a, b).map((p, i) => `${i ? "L" : "M"} ${r2(p.x)} ${r2(p.y)}`).join(" ");
}

const centre = (r: Rect): Rect => ({ x: r.x + r.w / 2, y: r.y + r.h / 2, w: 0, h: 0 });

// Boxes on a grid joined by orthogonal arrows. Packets sent along a path are timeline tweens, so they seek.
export function flow(ctx: Ctx, opts: FlowOpts): FlowHandle {
  const { grid } = opts;
  const [cw, ch] = [grid.w / grid.cols, grid.h / grid.rows];
  const boxes = new Map<string, Rect>();
  const els = new Map<string, HTMLElement>();
  const rings = new Map<string, HTMLElement>();
  const labels = new Map<string, HTMLElement>();
  const need = (id: string) => {
    if (!boxes.has(id)) throw new Error(`flow: unknown node "${id}"`);
    return id;
  };

  const known = new Set(opts.nodes.map((n) => n.id));
  for (const e of opts.edges) for (const id of [e.from, e.to]) if (!known.has(id)) throw new Error(`flow: unknown node "${id}"`);

  const markerId = `k-flow-arrow-${++markers}`;
  const defs = document.createElementNS(SVG, "defs");
  defs.innerHTML = `<marker id="${markerId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto" markerUnits="strokeWidth"><path d="M0 0L10 5L0 10z" style="fill:var(--k-line)"/></marker>`;
  ctx.svg.append(defs);

  for (const n of opts.nodes) {
    const [w, h] = [cw * FILL, ch * FILL];
    const box = { x: grid.x + (n.col + 0.5) * cw - w / 2, y: grid.y + (n.row + 0.5) * ch - h / 2, w, h };
    boxes.set(n.id, box);
    const el = document.createElement("div");
    el.setAttribute("data-k-flow-node", n.id);
    Object.assign(el.style, {
      position: "absolute", left: `${box.x}px`, top: `${box.y}px`, width: `${w}px`, height: `${h}px`, boxSizing: "border-box",
      padding: "8px 12px", border: "3px solid var(--k-line)", borderRadius: "14px", background: "var(--k-surface)", color: "var(--k-fg)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
      textAlign: "center", font: `600 ${MAX_FONT}px/${LINE_H} var(--k-font)`, overflow: "visible", zIndex: "2",
    });
    if (n.icon) {
      const i = el.appendChild(document.createElement("div"));
      i.innerHTML = `<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconGlyph(n.icon, ctx.problem)}</svg>`;
      i.style.flex = "none";
    }
    const text = el.appendChild(document.createElement("div"));
    text.textContent = n.label;
    Object.assign(text.style, { overflowWrap: "anywhere", maxWidth: "100%" });
    const ring = el.appendChild(document.createElement("div"));
    Object.assign(ring.style, {
      position: "absolute", inset: "-6px", border: "5px solid var(--k-accent)", borderRadius: "18px", pointerEvents: "none",
    });
    ctx.html.append(el);
    gsap.set(el, { autoAlpha: 0, x: 0, y: 0 }); // x, y: the pulse writes a transform; unset, play and seek would differ
    gsap.set(ring, { autoAlpha: 0 });
    els.set(n.id, el);
    rings.set(n.id, ring);
    labels.set(n.id, text);
  }

  const edges = opts.edges.map((e) => {
    const [a, b] = [boxes.get(need(e.from))!, boxes.get(need(e.to))!];
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", edgePath(a, b));
    path.setAttribute("marker-end", `url(#${markerId})`);
    Object.assign(path.style, { fill: "none", stroke: "var(--k-line)", strokeWidth: "4", strokeLinejoin: "round" });
    ctx.svg.append(path);
    gsap.set(path, { autoAlpha: 0 });
    let tag: HTMLElement | undefined;
    if (e.label) {
      const pts = edgePoints(a, b);
      const i = Math.floor((pts.length - 1) / 2);
      tag = document.createElement("div");
      tag.textContent = e.label;
      Object.assign(tag.style, {
        position: "absolute", left: `${(pts[i].x + pts[i + 1].x) / 2}px`, top: `${(pts[i].y + pts[i + 1].y) / 2}px`,
        translate: "-50% -50%", padding: "2px 10px", borderRadius: "8px", background: "var(--k-bg)", color: "var(--k-fg)",
        font: `600 ${FLOOR}px/${LINE_H} var(--k-font)`, whiteSpace: "nowrap", zIndex: "3",
      });
      ctx.html.append(tag);
      gsap.set(tag, { autoAlpha: 0 });
    }
    return { from: e.from, to: e.to, path, tag, shown: false };
  });

  // Labels are fitted on first use: the layout exists by then (like callout's measuring), not while building.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    for (const [id, text] of labels) {
      let size = MAX_FONT;
      const el = els.get(id)!;
      const over = () => text.offsetHeight > LINE_H * size * MAX_LINES + 1 || text.offsetHeight + (el.querySelector("svg") ? 44 : 0) > el.clientHeight - 16 || text.scrollWidth > text.clientWidth;
      for (; size > FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      el.style.fontSize = `${size}px`;
      if (over()) ctx.problem(`flow: label of "${id}" too long`);
    }
  };

  const shown = new Set<string>();
  const lit = new Set<string>();

  return {
    node: (id) => els.get(need(id))!,
    show(ids) {
      const want = (ids ?? [...boxes.keys()]).map(need).filter((id) => !shown.has(id));
      want.forEach((id) => shown.add(id));
      const ready = edges.filter((e) => shown.has(e.from) && shown.has(e.to) && !e.shown);
      ready.forEach((e) => (e.shown = true));
      return (tl) => {
        fit();
        const at = tl.duration();
        tl.to(want.map((id) => els.get(id)!), { autoAlpha: 1, duration: 0.4 }, at);
        tl.to(ready.flatMap((e) => [e.path, ...(e.tag ? [e.tag] : [])]), { autoAlpha: 1, duration: 0.4 }, at + 0.2);
        if (!want.length && !ready.length) tl.set({}, {}, at + 0.4);
      };
    },
    highlight(ids) {
      const next = new Set(ids.map(need));
      const on = [...next].filter((id) => !lit.has(id));
      const off = [...lit].filter((id) => !next.has(id));
      lit.clear();
      next.forEach((id) => lit.add(id));
      return (tl) => {
        fit();
        const at = tl.duration();
        tl.to(on.map((id) => rings.get(id)!), { autoAlpha: 1, duration: 0.3 }, at);
        tl.to(off.map((id) => rings.get(id)!), { autoAlpha: 0, duration: 0.3 }, at);
        if (!on.length && !off.length) tl.set({}, {}, at + 0.3);
      };
    },
    send({ path, count = 1, label }) {
      path.forEach(need);
      const legs = path.slice(1).map((id, i) => edgePath(centre(boxes.get(path[i])!), centre(boxes.get(id)!)));
      return (tl) => {
        fit();
        const at = tl.duration();
        const hop = motion.step;
        const from = boxes.get(path[0])!;
        const pulse = (id: string, t: number) => {
          const ring = rings.get(id)!;
          const base = lit.has(id) ? 1 : 0;
          tl.fromTo(ring, { autoAlpha: 1 }, { autoAlpha: base, duration: 0.5, immediateRender: false }, t);
          tl.fromTo(els.get(id)!, { scale: 1 }, { scale: 1.06, duration: 0.15, repeat: 1, yoyo: true, ease: "power1.inOut", immediateRender: false }, t);
        };
        for (let k = 0; k < count; k++) {
          const dot = document.createElement("div");
          dot.setAttribute("data-k-packet", "");
          Object.assign(dot.style, {
            position: "absolute", left: "0", top: "0", width: "0", height: "0", zIndex: "4", pointerEvents: "none",
          });
          dot.innerHTML = `<div style="position:absolute;left:-12px;top:-12px;width:24px;height:24px;border-radius:50%;background:var(--k-accent);border:3px solid var(--k-bg);box-sizing:border-box"></div>`;
          if (label) {
            const t = dot.appendChild(document.createElement("div"));
            t.textContent = label;
            Object.assign(t.style, {
              position: "absolute", left: "0", top: "-52px", translate: "-50% 0", whiteSpace: "nowrap", color: "var(--k-fg)", background: "var(--k-bg)",
              padding: "0 8px", borderRadius: "6px", font: `600 ${FLOOR}px/${LINE_H} var(--k-font)`,
            });
          }
          ctx.html.append(dot);
          // At the first leg's start, where a rewound motionPath tween leaves it: play and seek then agree.
          gsap.set(dot, { autoAlpha: 0, x: from.x + from.w / 2, y: from.y + from.h / 2 });
          let t = at + k * GAP;
          tl.set(dot, { autoAlpha: 1 }, t);
          pulse(path[0], t);
          legs.forEach((d, i) => {
            tl.to(dot, { motionPath: { path: d }, duration: hop, ease: "none" }, t);
            t += hop;
            pulse(path[i + 1], t);
            t += WAIT;
          });
          tl.set(dot, { autoAlpha: 0 }, t);
        }
      };
    },
  };
}
