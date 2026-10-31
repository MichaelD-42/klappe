import { gsap } from "gsap";
import { drawOn, typeSize } from "./draw";
import { motion } from "../theme";
import type { Ctx, Point as Pt, Rect, StepAdder } from "../types";

export type DepLink = { from: string; to: string }; // from depends on to
export type DepGraphOpts = {
  nodes: { id: string; label: string }[];
  links: DepLink[];
} & Rect;
export interface DepGraphHandle {
  show: StepAdder; // the boxes fade in column by column, then the arrows draw on
  // Lights id and what it depends on, hop by hop (up: what depends on it, the blast radius); the rest dims.
  trace(id: string, opts?: { up?: boolean }): StepAdder;
  clear: StepAdder; // everything back to plain
  node(id: string): Element;
}
export interface DepNode { id: string; label: string; col: number; x: number; y: number; w: number; h: number }

const SVG = "http://www.w3.org/2000/svg";
const MIN_W = 140; // a box narrower than this cannot hold a label at the floor
const MIN_H = 48;
const FLOOR = 20; // legibility floor, scene px
const MAX_FONT = 26;
const HOP = 0.35; // seconds between hops of a trace
const DIM = 0.3;
const ARROW = 14;

// The nodes in columns: a node sits one column right of the furthest node that depends on it, so every arrow
// points right. Within a column, nodes go in the mean order of the nodes that depend on them (the first column
// in input order), which keeps arrows from crossing where it can. A link that skips columns takes a slot of its
// own in each column it crosses (via[i], one point per column), so it runs between the boxes, not through one.
// Deterministic. Pure, for tests.
export function depLayout(opts: DepGraphOpts): { nodes: DepNode[]; links: DepLink[]; via: Pt[][]; problems: string[] } {
  const problems: string[] = [];
  const ids = new Set(opts.nodes.map((n) => n.id));
  const links = opts.links.filter((l) => {
    const bad = [l.from, l.to].find((id) => !ids.has(id));
    if (bad) problems.push(`depGraph: no node "${bad}"`);
    return !bad;
  });
  // Longest path from the nodes nothing depends on (Kahn's order); what is left over sits in a cycle.
  const col = new Map(opts.nodes.map((n) => [n.id, 0]));
  const indeg = new Map(opts.nodes.map((n) => [n.id, links.filter((l) => l.to === n.id).length]));
  const queue = opts.nodes.filter((n) => !indeg.get(n.id)).map((n) => n.id);
  for (let k = 0; k < queue.length; k++)
    for (const l of links.filter((l) => l.from === queue[k])) {
      col.set(l.to, Math.max(col.get(l.to)!, col.get(queue[k])! + 1));
      indeg.set(l.to, indeg.get(l.to)! - 1);
      if (!indeg.get(l.to)) queue.push(l.to);
    }
  const stuck = opts.nodes.filter((n) => !queue.includes(n.id));
  if (stuck.length) {
    problems.push(`depGraph: a cycle through ${stuck.map((n) => `"${n.id}"`).join(", ")}; a dependency graph has none`);
    stuck.forEach((n) => col.set(n.id, 0));
  }
  // Each link as a chain of slots, one per column: its two nodes and a stand-in ("~i~c") in each column between.
  const chains = links.map((l, i) => {
    const [a, b] = [col.get(l.from)!, col.get(l.to)!];
    const mid = Array.from({ length: Math.max(0, b - a - 1) }, (_, k) => `~${i}~${a + 1 + k}`);
    mid.forEach((id, k) => col.set(id, a + 1 + k));
    return [l.from, ...mid, l.to];
  });
  const before = new Map<string, string[]>(); // the slots one column left that lead into a slot
  for (const ch of chains) ch.slice(1).forEach((id, k) => col.get(ch[k])! < col.get(id)! && before.set(id, [...(before.get(id) ?? []), ch[k]]));
  const all = [...opts.nodes.map((n) => n.id), ...chains.flatMap((ch) => ch.slice(1, -1))];
  const cols = Math.max(0, ...col.values()) + 1;
  const columns: string[][] = Array.from({ length: cols }, () => []);
  const order = new Map<string, number>(); // a slot's place in its column
  for (let c = 0; c < cols; c++) {
    const here = all.filter((id) => col.get(id) === c);
    const mean = (id: string) => {
      const up = (before.get(id) ?? []).map((u) => order.get(u)! / Math.max(1, columns[col.get(u)!].length - 1));
      return up.length ? up.reduce((s, v) => s + v, 0) / up.length : 0;
    };
    columns[c] = c ? [...here].sort((a, b) => mean(a) - mean(b) || here.indexOf(a) - here.indexOf(b)) : here;
    columns[c].forEach((id, j) => order.set(id, j));
  }
  const colW = opts.w / cols;
  const rowH = opts.h / Math.max(1, ...columns.map((c) => c.length));
  const [bw, bh] = [Math.min(colW * 0.62, 320), Math.min(rowH * 0.6, 96)];
  if (bw < MIN_W) problems.push(`depGraph: ${cols} columns do not fit ${opts.w}px`);
  if (bh < MIN_H) problems.push(`depGraph: ${Math.round(opts.h / rowH)} nodes in one column do not fit ${opts.h}px`);
  const label = new Map(opts.nodes.map((n) => [n.id, n.label]));
  const slots = new Map(columns.flatMap((ids, c) =>
    ids.map((id, j) => [id, {
      id, label: label.get(id) ?? "", col: c, w: bw, h: bh,
      x: opts.x + (c + 0.5) * colW - bw / 2,
      y: opts.y + (opts.h - ids.length * rowH) / 2 + (j + 0.5) * rowH - bh / 2,
    }] as const),
  ));
  const via = chains.map((ch) => ch.slice(1, -1).map((id) => ({ x: slots.get(id)!.x + bw / 2, y: slots.get(id)!.y + bh / 2 })));
  return { nodes: opts.nodes.map((n) => slots.get(n.id)!), links, via, problems };
}

// The nodes a trace reaches, hop by hop: each node in the first hop that reaches it. Down follows what a node
// depends on; up follows what depends on it. Pure, for tests.
export function depReach(links: DepLink[], id: string, up = false): string[][] {
  const seen = new Set([id]);
  const hops = [[id]];
  for (;;) {
    const next: string[] = [];
    for (const from of hops[hops.length - 1])
      for (const l of links) {
        const [a, b] = up ? [l.to, l.from] : [l.from, l.to];
        if (a === from && !seen.has(b)) (seen.add(b), next.push(b));
      }
    if (!next.length) return hops;
    hops.push(next);
  }
}

// What depends on what: boxes in columns joined by arrows to what each depends on, laid out from the links
// alone. trace lights a node's dependencies hop by hop, or with up its blast radius; the rest dims.
export function depGraph(ctx: Ctx, opts: DepGraphOpts): DepGraphHandle {
  const lay = depLayout(opts);
  lay.problems.forEach((p) => ctx.problem(p));
  const at = new Map(lay.nodes.map((n) => [n.id, n]));
  const els = new Map(lay.nodes.map((n) => {
    const el = ctx.html.appendChild(document.createElement("div"));
    el.dataset.kDepNode = n.id;
    Object.assign(el.style, {
      position: "absolute", left: `${n.x}px`, top: `${n.y}px`, width: `${n.w}px`, height: `${n.h}px`, boxSizing: "border-box", padding: "4px 12px",
      border: "3px solid var(--k-line)", borderRadius: "12px", background: "var(--k-surface)", color: "var(--k-fg)", zIndex: "2",
      display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", font: `600 ${typeSize("label", MAX_FONT)}px/1.2 var(--k-font)`,
    });
    const text = el.appendChild(document.createElement("div"));
    text.textContent = n.label;
    Object.assign(text.style, { overflowWrap: "anywhere", maxWidth: "100%" });
    const ring = el.appendChild(document.createElement("div"));
    Object.assign(ring.style, { position: "absolute", inset: "-7px", border: "5px solid var(--k-accent)", borderRadius: "16px", pointerEvents: "none" });
    gsap.set(el, { autoAlpha: 0 });
    gsap.set(ring, { autoAlpha: 0 });
    return [n.id, { el, text, ring }] as const;
  }));

  // Each arrow leaves the right face and enters the left face at its own port, ordered by where the other end is.
  const viaOf = new Map(lay.links.map((l, i) => [l, lay.via[i]]));
  const port = (id: string, side: "out" | "in") => {
    const mine = lay.links.filter((l) => (side === "out" ? l.from : l.to) === id);
    // Where the link heads next: its first stand-in, or the node at its other end.
    const toward = (l: DepLink) => {
      const v = viaOf.get(l)!;
      const n = at.get(side === "out" ? l.to : l.from)!;
      return v.length ? v[side === "out" ? 0 : v.length - 1].y : n.y + n.h / 2;
    };
    mine.sort((a, b) => toward(a) - toward(b));
    const n = at.get(id)!;
    const step = Math.min(16, (n.h * 0.6) / Math.max(1, mine.length));
    return new Map(mine.map((l, k) => [l, n.y + n.h / 2 + (k - (mine.length - 1) / 2) * step]));
  };
  const outs = new Map(lay.nodes.map((n) => [n.id, port(n.id, "out")]));
  const ins = new Map(lay.nodes.map((n) => [n.id, port(n.id, "in")]));
  const edges = lay.links.map((l) => {
    const [a, b] = [at.get(l.from)!, at.get(l.to)!];
    const [x0, y0, x1, y1] = [a.x + a.w, outs.get(l.from)!.get(l)!, b.x - ARROW, ins.get(l.to)!.get(l)!];
    // A curve to each stand-in's left edge, straight across its slot, a curve on to the end.
    let d = `M ${x0} ${y0}`;
    let p = { x: x0, y: y0 };
    const curve = (q: Pt) => {
      const m = Math.max(40, (q.x - p.x) / 2);
      d += ` C ${p.x + m} ${p.y}, ${q.x - m} ${q.y}, ${q.x} ${q.y}`;
      p = q;
    };
    for (const v of viaOf.get(l)!) {
      curve({ x: v.x - a.w / 2, y: v.y });
      d += ` L ${v.x + a.w / 2} ${v.y}`;
      p = { x: v.x + a.w / 2, y: v.y };
    }
    curve({ x: x1, y: y1 });
    const tip = `M ${x1 + ARROW} ${y1} L ${x1} ${y1 - 8} L ${x1} ${y1 + 8} Z`;
    const g = ctx.svg.appendChild(document.createElementNS(SVG, "g"));
    g.setAttribute("data-k-dep-link", `${l.from}>${l.to}`);
    const path = (dd: string, style: Partial<CSSStyleDeclaration>) => {
      const p = g.appendChild(document.createElementNS(SVG, "path"));
      p.setAttribute("d", dd);
      Object.assign(p.style, style);
      return p;
    };
    const line = path(d, { fill: "none", stroke: "var(--k-line)", strokeWidth: "3" });
    const head = path(tip, { fill: "var(--k-line)" });
    const hot = path(d, { fill: "none", stroke: "var(--k-accent)", strokeWidth: "5" });
    const hotHead = path(tip, { fill: "var(--k-accent)" });
    gsap.set([line, head], { autoAlpha: 0 });
    gsap.set([hot, hotHead], { autoAlpha: 0 });
    return { l, g, line, head, hot: [hot, hotHead] };
  });

  // Labels are fitted on first use: the layout exists by then, not while building.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    for (const [id, { el, text }] of els) {
      const over = () => text.scrollHeight > el.clientHeight || text.offsetHeight > 2 * 1.2 * parseFloat(el.style.fontSize || `${typeSize("label", MAX_FONT)}`) + 1;
      for (let size = typeSize("label", MAX_FONT); size >= FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      if (over()) ctx.problem(`depGraph: label of "${id}" too long`);
    }
  };

  // What the steps added so far left lit; empty: nothing dims.
  let lit = new Set<string>();
  const key = (l: DepLink) => `${l.from}>${l.to}`;
  const relight = (tl: gsap.core.Timeline, hops: string[][], up: boolean) => {
    const t0 = tl.duration();
    const was = lit;
    const hop = new Map(hops.flatMap((h, k) => h.map((id) => [id, k] as const)));
    // An arrow lights when the trace runs along it: from a node to the next hop.
    const path = (l: DepLink) => {
      const [a, b] = up ? [l.to, l.from] : [l.from, l.to];
      return hop.has(a) && hop.get(b) === hop.get(a)! + 1;
    };
    const now = new Set([...hop.keys(), ...lay.links.filter(path).map(key)]);
    const level = (set: Set<string>, k: string) => (set.size && !set.has(k) ? DIM : 1);
    const d = { duration: motion.step, immediateRender: false };
    for (const [id, { el, ring }] of els) {
      if (level(was, id) !== level(now, id)) tl.fromTo(el, { opacity: level(was, id) }, { opacity: level(now, id), ...d }, t0);
      const [on, off] = [now.has(id), was.has(id)];
      if (on && !off) tl.fromTo(ring, { autoAlpha: 0 }, { autoAlpha: 1, ...d }, t0 + hop.get(id)! * HOP);
      if (!on && off) tl.fromTo(ring, { autoAlpha: 1 }, { autoAlpha: 0, ...d }, t0);
    }
    for (const e of edges) {
      const k = key(e.l);
      if (level(was, k) !== level(now, k)) tl.fromTo([e.line, e.head], { opacity: level(was, k) }, { opacity: level(now, k), ...d }, t0);
      const [on, off] = [now.has(k), was.has(k)];
      if (on && !off) tl.fromTo(e.hot, { autoAlpha: 0 }, { autoAlpha: 1, ...d }, t0 + hop.get(up ? e.l.to : e.l.from)! * HOP + HOP / 2);
      if (!on && off) tl.fromTo(e.hot, { autoAlpha: 1 }, { autoAlpha: 0, ...d }, t0);
    }
    tl.set({}, {}, t0 + motion.step); // a step that changes nothing still takes a beat
    lit = now;
  };

  return {
    node: (id) => {
      const e = els.get(id);
      if (!e) throw new Error(`depGraph: unknown node "${id}"`);
      return e.el;
    },
    show(tl) {
      fit();
      const t0 = tl.duration();
      for (const [id, { el }] of els) tl.to(el, { autoAlpha: 1, duration: 0.4 }, t0 + at.get(id)!.col * 0.15);
      const cols = Math.max(0, ...lay.nodes.map((n) => n.col));
      edges.forEach((e, i) => {
        const t = t0 + cols * 0.15 + 0.3 + i * 0.05;
        tl.set(e.line, { autoAlpha: 1 }, t);
        drawOn(e.line, { duration: 0.5, each: 0, at: t })(tl);
        tl.set(e.head, { autoAlpha: 1 }, t + 0.45); // the head arrives with the line
      });
    },
    trace: (id, o = {}) => (tl) => {
      fit();
      if (!els.has(id)) return void (ctx.problem(`depGraph: trace of unknown node "${id}"`), tl.set({}, {}, tl.duration() + 0.4));
      relight(tl, depReach(lay.links, id, o.up), !!o.up);
    },
    clear: (tl) => relight(tl, [], false),
  };
}
