import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { drawOn } from "./draw";
import { iconGlyph, type IconName } from "./icons";
import { motion } from "../theme";
import type { Ctx, Point as Pt, Rect, StepAdder } from "../types";

gsap.registerPlugin(MotionPathPlugin);

export interface FlowOpts {
  nodes: { id: string; label: string; col: number; row: number; icon?: IconName }[];
  edges: { from: string; to: string; label?: string }[];
  grid: Rect & { cols: number; rows: number };
}
export interface FlowHandle {
  show(ids?: string[]): StepAdder;
  highlight(ids: string[]): StepAdder;
  send(o: { path: string[]; count?: number; label?: string }): StepAdder;
  fire(from: string, to: string): StepAdder;
  node(id: string): Element;
}

const SVG = "http://www.w3.org/2000/svg";
const FILL = 0.7; // a node fills this share of its cell
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 32;
const MAX_LINES = 3;
const LINE_H = 1.2;
const GAP = 0.45; // seconds between packets: longer than the dwell, so one box never holds two
const DOT = 30;
const INSET = 24; // a packet rests this far inside the box edge, clear of the label
const ARROW = 20; // arrowhead length
const WAIT = 0.3; // seconds a packet rests at a node

const r2 = (n: number) => Math.round(n * 100) / 100;

// Offsets along the faces: out on a's exit face, in on b's entry face (from the face middle), mid shifts the middle run.
interface Ports { out?: number; in?: number; mid?: number }

// The corner points of the orthogonal route from box a to box b: horizontal out, vertical, horizontal in;
// a straight line when the exit and entry rows coincide. Boxes in one column connect vertically instead.
// Points sit on the box edges (zero-size boxes: centres).
function edgePoints(a: Rect, b: Rect, o: Ports = {}): Pt[] {
  const [ax, ay, bx, by] = [a.x + a.w / 2, a.y + a.h / 2, b.x + b.w / 2, b.y + b.h / 2];
  const [po, pi, pm] = [o.out ?? 0, o.in ?? 0, o.mid ?? 0];
  if (ax === bx) {
    const s = by >= ay ? 1 : -1;
    const [y0, y1, x0, x1] = [ay + (s * a.h) / 2, by - (s * b.h) / 2, ax + po, bx + pi];
    if (x0 === x1) return [{ x: x0, y: y0 }, { x: x1, y: y1 }];
    const my = (y0 + y1) / 2 + pm;
    return [{ x: x0, y: y0 }, { x: x0, y: my }, { x: x1, y: my }, { x: x1, y: y1 }];
  }
  const s = bx > ax ? 1 : -1;
  const [x0, x1, y0, y1] = [ax + (s * a.w) / 2, bx - (s * b.w) / 2, ay + po, by + pi];
  if (y0 === y1) return [{ x: x0, y: y0 }, { x: x1, y: y1 }];
  const mx = (x0 + x1) / 2 + pm;
  return [{ x: x0, y: y0 }, { x: mx, y: y0 }, { x: mx, y: y1 }, { x: x1, y: y1 }];
}

const fmt = (pts: Pt[]) => pts.map((p, i) => `${i ? "L" : "M"} ${r2(p.x)} ${r2(p.y)}`).join(" ");

// The SVG path data of that route: "M x y L x y …". o: optional port offsets, see Ports.
export function edgePath(a: Rect, b: Rect, o?: Ports): string {
  return fmt(edgePoints(a, b, o));
}

const SPREAD = 36; // widest gap between ports on one face
const LANE = 28; // gap between parallel middle runs

// Every edge's route with its own port on each face and its own middle run, so no two edges share a
// segment or an end point. Faces with several edges spread them along the face, ordered by where the other end is.
export function flowRoutes(opts: FlowOpts): { from: string; to: string; points: Pt[] }[] {
  const { grid } = opts;
  const [cw, ch] = [grid.w / grid.cols, grid.h / grid.rows];
  const boxes = new Map<string, Rect>();
  for (const n of opts.nodes) {
    const [w, h] = [cw * FILL, ch * FILL];
    boxes.set(n.id, { x: grid.x + (n.col + 0.5) * cw - w / 2, y: grid.y + (n.row + 0.5) * ch - h / 2, w, h });
  }
  const box = (id: string) => {
    const b = boxes.get(id);
    if (!b) throw new Error(`flow: unknown node "${id}"`);
    return b;
  };
  const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  // A self-loop (a state that stays where it is) leaves the box and comes back on its first face no other edge uses
  // (top, right, bottom, left), in the cell's gap on that side, clockwise; it takes no port and no lane.
  const loop = (id: string, b: Rect): Pt[] => {
    const face = (["u", "r", "d", "l"] as const).find((f) => !faces.has(`${id}|${f}`)) ?? "u";
    const [L, R, T, B] = [b.x, b.x + b.w, b.y, b.y + b.h];
    const [gx, gy] = [((cw * (1 - FILL)) / 2) * 0.8, ((ch * (1 - FILL)) / 2) * 0.8];
    const [x0, x1, y0, y1] = [L + b.w * 0.3, L + b.w * 0.7, T + b.h * 0.3, T + b.h * 0.7];
    const p = (x: number, y: number) => ({ x, y });
    if (face === "u") return [p(x0, T), p(x0, T - gy), p(x1, T - gy), p(x1, T)];
    if (face === "r") return [p(R, y0), p(R + gx, y0), p(R + gx, y1), p(R, y1)];
    if (face === "d") return [p(x1, B), p(x1, B + gy), p(x0, B + gy), p(x0, B)];
    return [p(L, y1), p(L - gx, y1), p(L - gx, y0), p(L, y0)];
  };
  const ports = opts.edges.map(() => ({ out: 0, in: 0, mid: 0 }));
  // face users: node id + face -> [edge index, role, position of the other end]
  const faces = new Map<string, { i: number; role: "out" | "in"; at: number; extent: number }[]>();
  opts.edges.forEach((e, i) => {
    const [a, b] = [box(e.from), box(e.to)];
    if (e.from === e.to) return;
    const vertical = mid(a).x === mid(b).x;
    const [pa, pb] = [mid(a), mid(b)];
    const dir = vertical ? (pb.y >= pa.y ? "d" : "u") : pb.x > pa.x ? "r" : "l";
    const opp = { d: "u", u: "d", r: "l", l: "r" }[dir]!;
    const add = (id: string, face: string, role: "out" | "in", at: number, extent: number) => {
      const k = `${id}|${face}`;
      faces.set(k, [...(faces.get(k) ?? []), { i, role, at, extent }]);
    };
    add(e.from, dir, "out", vertical ? pb.x : pb.y, vertical ? a.w : a.h);
    add(e.to, opp, "in", vertical ? pa.x : pa.y, vertical ? b.w : b.h);
  });
  for (const users of faces.values()) {
    users.sort((u, v) => u.at - v.at || u.i - v.i);
    const step = Math.min(SPREAD, (users[0].extent * 0.6) / users.length);
    users.forEach((u, k) => (ports[u.i][u.role] = (k - (users.length - 1) / 2) * step));
  }
  const route = () => opts.edges.map((e, i) => (e.from === e.to ? loop(e.from, box(e.from)) : edgePoints(box(e.from), box(e.to), ports[i])));
  // Bent routes in the same lane (same middle line) get side-by-side lanes.
  const lanes = new Map<string, number[]>();
  route().forEach((pts, i) => {
    if (pts.length === 4 && opts.edges[i].from !== opts.edges[i].to) {
      const k = pts[1].x === pts[2].x ? `v${pts[1].x}` : `h${pts[1].y}`;
      lanes.set(k, [...(lanes.get(k) ?? []), i]);
    }
  });
  for (const ids of lanes.values()) ids.forEach((i, k) => (ports[i].mid = (k - (ids.length - 1) / 2) * LANE));
  return route().map((points, i) => ({ from: opts.edges[i].from, to: opts.edges[i].to, points }));
}


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

  const routes = flowRoutes(opts);
  const edges = routes.map((r, k) => {
    const pts = r.points;
    const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const d = { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
    const base = { x: q.x - d.x * ARROW, y: q.y - d.y * ARROW };
    // The line stops at the arrowhead's base; the head is its own triangle that appears when the line arrives.
    const path = document.createElementNS(SVG, "path");
    const line = fmt([...pts.slice(0, -1), base]);
    path.setAttribute("d", line);
    Object.assign(path.style, { fill: "none", stroke: "var(--k-line)", strokeWidth: "4", strokeLinejoin: "round" });
    const head = document.createElementNS(SVG, "path");
    const tip = fmt([q, { x: base.x - d.y * 11, y: base.y + d.x * 11 }, { x: base.x + d.y * 11, y: base.y - d.x * 11 }]) + " Z";
    head.setAttribute("d", tip);
    Object.assign(head.style, { fill: "var(--k-line)" });
    ctx.svg.append(path, head);
    gsap.set([path, head], { autoAlpha: 0 });
    let tag: HTMLElement | undefined;
    const label = opts.edges[k].label;
    if (label) {
      const i = Math.floor((pts.length - 1) / 2);
      tag = document.createElement("div");
      tag.textContent = label;
      Object.assign(tag.style, {
        position: "absolute", left: `${(pts[i].x + pts[i + 1].x) / 2}px`, top: `${(pts[i].y + pts[i + 1].y) / 2}px`,
        translate: "-50% -50%", padding: "2px 10px", borderRadius: "8px", background: "var(--k-bg)", color: "var(--k-fg)",
        font: `600 ${FLOOR}px/${LINE_H} var(--k-font)`, whiteSpace: "nowrap", zIndex: "3",
      });
      ctx.html.append(tag);
      gsap.set(tag, { autoAlpha: 0 });
    }
    return { from: r.from, to: r.to, line, tip, pts, path, head, tag, shown: false };
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
  let fired: SVGElement[] = []; // the accent line and head the last fire() drew, as the steps are added

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
        // Each arrow draws on after the boxes; its head and label arrive when the line does.
        const [draw, each, start] = [0.5, 0.15, at + 0.3];
        ready.forEach((e, i) => {
          const t = start + i * each;
          tl.set(e.path, { autoAlpha: 1 }, t);
          drawOn(e.path, { duration: draw, each: 0, at: t })(tl);
          tl.to([e.head, ...(e.tag ? [e.tag] : [])], { autoAlpha: 1, duration: 0.15 }, t + draw - 0.1);
        });
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
        // An empty target list makes GSAP warn "target not found": skip it.
        if (on.length) tl.to(on.map((id) => rings.get(id)!), { autoAlpha: 1, duration: 0.3 }, at);
        if (off.length) tl.to(off.map((id) => rings.get(id)!), { autoAlpha: 0, duration: 0.3 }, at);
        if (!on.length && !off.length) tl.set({}, {}, at + 0.3);
      };
    },
    fire(from, to) {
      [from, to].forEach(need);
      const e = edges.find((x) => x.from === from && x.to === to);
      if (!e) ctx.problem(`flow: no edge from "${from}" to "${to}"`);
      // Each fire draws its own accent copy of the edge, so firing one edge twice never redraws a shape a step back
      // would have to undo.
      const hot = e ? [e.line, e.tip].map((d, i) => {
        const p = document.createElementNS(SVG, "path");
        p.setAttribute("d", d);
        Object.assign(p.style, i ? { fill: "var(--k-accent)" } : { fill: "none", stroke: "var(--k-accent)", strokeWidth: "6", strokeLinejoin: "round" });
        ctx.svg.append(p);
        gsap.set(p, { autoAlpha: 0 });
        return p;
      }) : [];
      const was = fired;
      const off = [...lit].filter((id) => id !== to);
      const on = !lit.has(to);
      lit.clear();
      lit.add(to);
      fired = hot;
      return (tl) => {
        fit();
        const at = tl.duration();
        // The edge fired before settles, the ring leaves the old state, this edge draws on in accent, and the
        // ring lands on the new state as the line arrives.
        if (was.length) tl.to(was, { autoAlpha: 0, duration: 0.3 }, at);
        if (off.length) tl.to(off.map((id) => rings.get(id)!), { autoAlpha: 0, duration: 0.3 }, at);
        if (e) {
          tl.set([hot[0], e.path, e.head, ...(e.tag ? [e.tag] : [])], { autoAlpha: 1 }, at);
          drawOn(hot[0], { duration: 0.5, each: 0, at })(tl);
          tl.to(hot[1], { autoAlpha: 1, duration: 0.1 }, at + 0.45);
        }
        if (on) tl.to(rings.get(to)!, { autoAlpha: 1, duration: 0.3 }, at + 0.45);
        else tl.set({}, {}, at + 0.75);
      };
    },
    send({ path, count = 1, label }) {
      path.forEach(need);
      if (path.length < 2) ctx.problem("flow: send needs a path of at least 2 nodes");
      // Each hop follows its edge's route; a hop without an edge in that direction is reported and goes box to box.
      const legs = path.slice(1).map((to, i) => {
        const from = path[i];
        const e = edges.find((x) => x.from === from && x.to === to);
        if (e) return e.pts;
        const back = edges.some((x) => x.from === to && x.to === from);
        ctx.problem(back ? `flow: edge between "${from}" and "${to}" runs from "${to}" to "${from}"` : `flow: no edge from "${from}" to "${to}"`);
        return edgePoints(boxes.get(from)!, boxes.get(to)!);
      }).map((pts) => {
        // From just inside the box the edge leaves to just inside the box it enters, clear of the labels.
        const [p0, p1, q0, q1] = [pts[0], pts[1], pts[pts.length - 2], pts[pts.length - 1]];
        const u = (a: Pt, b: Pt) => { const l = Math.hypot(b.x - a.x, b.y - a.y) || 1; return { x: (b.x - a.x) / l, y: (b.y - a.y) / l }; };
        const [d0, d1] = [u(p0, p1), u(q0, q1)];
        return [{ x: p0.x - d0.x * INSET, y: p0.y - d0.y * INSET }, ...pts, { x: q1.x + d1.x * INSET, y: q1.y + d1.y * INSET }];
      });
      return (tl) => {
        fit();
        const at = tl.duration();
        const hop = motion.step;
        const pulse = (id: string, t: number) => {
          const ring = rings.get(id)!;
          const base = lit.has(id) ? 1 : 0;
          tl.fromTo(ring, { autoAlpha: 1 }, { autoAlpha: base, duration: 0.5, immediateRender: false }, t);
          tl.fromTo(els.get(id)!, { scale: 1 }, { scale: 1.06, duration: 0.15, repeat: 1, yoyo: true, ease: "power1.inOut", immediateRender: false }, t);
        };
        if (!legs.length) tl.set({}, {}, at + 0.1);
        for (let k = 0; legs.length && k < count; k++) {
          const dot = document.createElement("div");
          dot.setAttribute("data-k-packet", "");
          Object.assign(dot.style, {
            position: "absolute", left: "0", top: "0", width: "0", height: "0", zIndex: "4", pointerEvents: "none",
          });
          const r = DOT / 2;
          dot.innerHTML = `<div style="position:absolute;left:-${r}px;top:-${r}px;width:${DOT}px;height:${DOT}px;border-radius:50%;background:var(--k-accent);border:3px solid var(--k-bg);box-sizing:border-box"></div>`;
          if (label && k === 0) {
            const t = dot.appendChild(document.createElement("div"));
            t.textContent = label;
            Object.assign(t.style, {
              position: "absolute", left: "0", top: `${-r - 40}px`, translate: "-50% 0", whiteSpace: "nowrap", color: "var(--k-fg)", background: "var(--k-bg)",
              padding: "0 8px", borderRadius: "6px", font: `600 ${FLOOR}px/${LINE_H} var(--k-font)`,
            });
          }
          ctx.html.append(dot);
          // At the first leg's start, where a rewound motionPath tween leaves it: play and seek then agree.
          gsap.set(dot, { autoAlpha: 0, x: legs[0][0].x, y: legs[0][0].y });
          let t = at + k * GAP;
          pulse(path[0], t);
          legs.forEach((pts, i) => {
            tl.set(dot, { autoAlpha: 1 }, t);
            tl.to(dot, { motionPath: { path: fmt(pts) }, duration: hop, ease: "none" }, t);
            t += hop;
            pulse(path[i + 1], t);
            t += WAIT;
            tl.set(dot, { autoAlpha: 0 }, t); // the packet passes through the box unseen and leaves by the next edge
          });
        }
      };
    },
  };
}
