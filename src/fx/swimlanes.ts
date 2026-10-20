import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { drawOn } from "./draw";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

gsap.registerPlugin(MotionPathPlugin);

export type SwimlanesOpts = {
  lanes: { id: string; label: string }[];
  tasks: { id: string; lane: string; col: number; label: string }[];
  links: { from: string; to: string }[];
} & Rect;
export interface SwimlanesHandle {
  show: StepAdder;
  walk(taskId: string): StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const LABEL_COL = 0.15; // the lane label column, share of w
const FILL_W = 0.7; // a task fills this share of its cell width
const FILL_H = 0.6; // and this share of its lane's height
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 32;
const LANE_FONT = 28;
const MAX_LINES = 3;
const LINE_H = 1.2;
const DOT = 30;
const INSET = 24; // the token rests on the top edge this far from the task's left corner, above the label
const ARROW = 20; // arrowhead length
const IDLE = 0.7; // lane fill strength before any walk
const DIM = 0.4; // lanes that are not active

const r2 = (n: number) => Math.round(n * 100) / 100;

type Pt = { x: number; y: number };
// Offsets along the faces: out on a's exit face, in on b's entry face (from the face middle), mid shifts the middle run.
interface Ports { out?: number; in?: number; mid?: number }

// Copied from flow.ts (no imports across element files): the corner points of the orthogonal route from box a to box b.
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

const SPREAD = 36; // widest gap between ports on one face
const LANE = 28; // gap between parallel middle runs

// The lane bands and task boxes: lanes split h equally, tasks sit in their lane at their column right of the label column.
function layout(opts: SwimlanesOpts) {
  const laneH = opts.h / opts.lanes.length;
  const labelW = opts.w * LABEL_COL;
  const cell = (opts.w - labelW) / (Math.max(0, ...opts.tasks.map((t) => t.col)) + 1);
  const bands = new Map(opts.lanes.map((l, i) => [l.id, { x: opts.x, y: opts.y + i * laneH, w: opts.w, h: laneH }]));
  const boxes = new Map<string, Rect>();
  for (const t of opts.tasks) {
    const band = bands.get(t.lane);
    if (!band) throw new Error(`swimlanes: unknown lane "${t.lane}"`);
    const [w, h] = [cell * FILL_W, laneH * FILL_H];
    boxes.set(t.id, { x: opts.x + labelW + (t.col + 0.5) * cell - w / 2, y: band.y + (laneH - h) / 2, w, h });
  }
  for (const l of opts.links) for (const id of [l.from, l.to]) if (!boxes.has(id)) throw new Error(`swimlanes: unknown task "${id}"`);
  return { bands, boxes, labelW, laneH };
}

// Every link's route with its own port on each face and its own middle run, so no two links share a
// segment or an end point (copied from flow.ts's flowRoutes).
export function swimlaneRoutes(opts: SwimlanesOpts): { from: string; to: string; points: Pt[] }[] {
  const { boxes } = layout(opts);
  const box = (id: string) => boxes.get(id)!;
  const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
  const ports = opts.links.map(() => ({ out: 0, in: 0, mid: 0 }));
  const faces = new Map<string, { i: number; role: "out" | "in"; at: number; extent: number }[]>();
  opts.links.forEach((e, i) => {
    const [a, b] = [box(e.from), box(e.to)];
    const [pa, pb] = [mid(a), mid(b)];
    const vertical = pa.x === pb.x;
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
  const route = () => opts.links.map((e, i) => edgePoints(box(e.from), box(e.to), ports[i]));
  const runs = new Map<string, number[]>();
  route().forEach((pts, i) => {
    if (pts.length === 4) {
      const k = pts[1].x === pts[2].x ? `v${pts[1].x}` : `h${pts[1].y}`;
      runs.set(k, [...(runs.get(k) ?? []), i]);
    }
  });
  for (const ids of runs.values()) ids.forEach((i, k) => (ports[i].mid = (k - (ids.length - 1) / 2) * LANE));
  return route().map((points, i) => ({ from: opts.links[i].from, to: opts.links[i].to, points }));
}

// Horizontal lanes with their label on the left, tasks as boxes, links as arrows. walk() moves a token between tasks.
export function swimlanes(ctx: Ctx, opts: SwimlanesOpts): SwimlanesHandle {
  const { bands, boxes, labelW, laneH } = layout(opts);
  const need = (id: string) => {
    if (!boxes.has(id)) throw new Error(`swimlanes: unknown task "${id}"`);
    return id;
  };

  const bandEls = new Map<string, SVGElement>();
  const laneLabels = new Map<string, { el: HTMLElement; text: HTMLElement }>();
  for (const l of opts.lanes) {
    const b = bands.get(l.id)!;
    const band = document.createElementNS(SVG, "rect");
    for (const [k, v] of Object.entries({ x: b.x, y: b.y + 3, width: b.w, height: b.h - 6 })) band.setAttribute(k, String(r2(v)));
    Object.assign(band.style, { fill: "var(--k-surface)", stroke: "var(--k-line)", strokeWidth: "2" });
    ctx.svg.append(band);
    gsap.set(band, { autoAlpha: 0 });
    bandEls.set(l.id, band);
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "absolute", left: `${b.x}px`, top: `${b.y}px`, width: `${labelW}px`, height: `${laneH}px`, boxSizing: "border-box",
      padding: "8px 16px", display: "flex", alignItems: "center", color: "var(--k-fg)", font: `700 ${LANE_FONT}px/${LINE_H} var(--k-font)`, zIndex: "1",
    });
    const text = el.appendChild(document.createElement("div"));
    text.textContent = l.label;
    Object.assign(text.style, { overflowWrap: "anywhere", maxWidth: "100%" });
    ctx.html.append(el);
    gsap.set(el, { autoAlpha: 0 });
    laneLabels.set(l.id, { el, text });
  }

  const taskEls = new Map<string, HTMLElement>();
  const taskText = new Map<string, HTMLElement>();
  for (const t of opts.tasks) {
    const b = boxes.get(t.id)!;
    const el = document.createElement("div");
    el.setAttribute("data-k-swimlane-task", t.id);
    Object.assign(el.style, {
      position: "absolute", left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, boxSizing: "border-box",
      padding: "8px 12px", border: "3px solid var(--k-line)", borderRadius: "14px", background: "var(--k-bg)", color: "var(--k-fg)",
      display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", font: `600 ${MAX_FONT}px/${LINE_H} var(--k-font)`, zIndex: "2",
    });
    const text = el.appendChild(document.createElement("div"));
    text.textContent = t.label;
    Object.assign(text.style, { overflowWrap: "anywhere", maxWidth: "100%" });
    ctx.html.append(el);
    gsap.set(el, { autoAlpha: 0 });
    taskEls.set(t.id, el);
    taskText.set(t.id, text);
  }

  const links = swimlaneRoutes(opts).map((r) => {
    const pts = r.points;
    const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
    const len = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    const d = { x: (q.x - p.x) / len, y: (q.y - p.y) / len };
    const base = { x: q.x - d.x * ARROW, y: q.y - d.y * ARROW };
    // The line stops at the arrowhead's base; the head is its own triangle that appears when the line arrives.
    const path = document.createElementNS(SVG, "path");
    path.setAttribute("d", fmt([...pts.slice(0, -1), base]));
    Object.assign(path.style, { fill: "none", stroke: "var(--k-line)", strokeWidth: "4", strokeLinejoin: "round" });
    const head = document.createElementNS(SVG, "path");
    head.setAttribute("d", fmt([q, { x: base.x - d.y * 11, y: base.y + d.x * 11 }, { x: base.x + d.y * 11, y: base.y - d.x * 11 }]) + " Z");
    Object.assign(head.style, { fill: "var(--k-line)" });
    ctx.svg.append(path, head);
    gsap.set([path, head], { autoAlpha: 0 });
    return { ...r, path, head };
  });

  // Labels are fitted on first use: the layout exists by then, not while building.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    const shrink = (el: HTMLElement, text: HTMLElement, max: number, msg: string) => {
      let size = max;
      const over = () => text.offsetHeight > LINE_H * size * MAX_LINES + 1 || text.offsetHeight > el.clientHeight - 16 || text.scrollWidth > text.clientWidth;
      for (; size > FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      el.style.fontSize = `${size}px`;
      if (over()) ctx.problem(msg);
    };
    for (const [id, { el, text }] of laneLabels) shrink(el, text, LANE_FONT, `swimlanes: label of lane "${id}" too long`);
    for (const [id, el] of taskEls) shrink(el, taskText.get(id)!, MAX_FONT, `swimlanes: label of "${id}" too long`);
  };

  const rest = (id: string): Pt => {
    const b = boxes.get(id)!;
    return { x: b.x + INSET, y: b.y };
  };
  const laneOf = new Map(opts.tasks.map((t) => [t.id, t.lane]));
  type Link = (typeof links)[number];
  let at: string | undefined; // the task the token rests at
  let lastDot: HTMLElement | undefined;
  let lastLink: Link | undefined;

  return {
    show(tl) {
      fit();
      const t = tl.duration();
      tl.to([...bandEls.values()], { autoAlpha: IDLE, duration: 0.4 }, t);
      tl.to([...laneLabels.values()].map((l) => l.el), { autoAlpha: 1, duration: 0.4 }, t);
      tl.to([...taskEls.values()], { autoAlpha: 1, duration: 0.4 }, t + 0.3);
      // Each arrow draws on after the tasks; its head arrives when the line does.
      const [draw, each, start] = [0.5, 0.15, t + 0.6];
      links.forEach((e, i) => {
        const s = start + i * each;
        tl.set(e.path, { autoAlpha: 1 }, s);
        drawOn(e.path, { duration: draw, each: 0, at: s })(tl);
        tl.to(e.head, { autoAlpha: 1, duration: 0.15 }, s + draw - 0.1);
      });
    },
    walk(id) {
      need(id);
      const from = at;
      const link = from ? links.find((l) => l.from === from && l.to === id) : undefined;
      const [prevTask, prevLink, prevDot] = [from, lastLink, lastDot];
      const dot = document.createElement("div");
      dot.setAttribute("data-k-token", "");
      Object.assign(dot.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0", zIndex: "4", pointerEvents: "none" });
      const r = DOT / 2;
      dot.innerHTML = `<div style="position:absolute;left:-${r}px;top:-${r}px;width:${DOT}px;height:${DOT}px;border-radius:50%;background:var(--k-accent);border:3px solid var(--k-bg);box-sizing:border-box"></div>`;
      ctx.html.append(dot);
      const target = rest(id);
      const path = from ? [rest(from), ...(link ? link.points : []), target] : [target];
      gsap.set(dot, { autoAlpha: 0, x: path[0].x, y: path[0].y });
      [at, lastDot, lastLink] = [id, dot, link ?? undefined];
      return (tl) => {
        fit();
        const t = tl.duration();
        // The last walk's task, link and token settle as this one starts (sets, so they seek).
        if (prevTask) tl.set(taskEls.get(prevTask)!, { borderColor: "var(--k-line)", immediateRender: false }, t);
        if (prevLink) {
          tl.set(prevLink.path, { stroke: "var(--k-line)", immediateRender: false }, t);
          tl.set(prevLink.head, { fill: "var(--k-line)", immediateRender: false }, t);
        }
        if (prevDot) tl.set(prevDot, { autoAlpha: 0, immediateRender: false }, t);
        tl.set(taskEls.get(id)!, { borderColor: "var(--k-accent)", immediateRender: false }, t);
        if (link) {
          tl.set(link.path, { stroke: "var(--k-accent)", immediateRender: false }, t);
          tl.set(link.head, { fill: "var(--k-accent)", immediateRender: false }, t);
        }
        // The active lane brightens; the others dim to 0.4 and their labels go muted (still above 3:1).
        for (const l of opts.lanes) {
          const on = l.id === laneOf.get(id);
          tl.to(bandEls.get(l.id)!, { autoAlpha: on ? 1 : DIM, duration: 0.4 }, t);
          tl.set(laneLabels.get(l.id)!.el, { color: on ? "var(--k-fg)" : "var(--k-muted)", immediateRender: false }, t);
        }
        if (path.length > 1) {
          tl.set(dot, { autoAlpha: 1, immediateRender: false }, t);
          tl.to(dot, { motionPath: { path: fmt(path) }, duration: motion.step, ease: "none" }, t);
        } else tl.to(dot, { autoAlpha: 1, duration: 0.3 }, t);
      };
    },
  };
}
