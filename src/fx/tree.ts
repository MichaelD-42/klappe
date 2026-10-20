import { gsap } from "gsap";
import * as d3 from "d3";
import { drawOn } from "./draw";
import type { Ctx, Rect, StepAdder } from "../types";

export interface TreeNode {
  label: string;
  children?: { edge: string; node: TreeNode }[];
}
export type TreeOpts = { root: TreeNode } & Rect & { build?: "all" | "levels" };
export interface TreeHandle {
  show: StepAdder;
  level(k: number): StepAdder;
  path(edges: string[]): StepAdder;
}

const SVG = "http://www.w3.org/2000/svg";
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)
const MAX_FONT = 28;
const LINE_H = 1.2;
const MAX_W = 280;
const MIN_W = 120; // a box narrower than this cannot hold a label at the floor
const BOX_H = 88;
const SIDE_GAP = 24; // clear space between neighbouring boxes
const EDGE_ROOM = 64; // vertical gap a level needs for its edge label

export interface TreeBox { id: string; label: string; depth: number; parent?: string; edge?: string; x: number; y: number; w: number; h: number }
export interface TreeLayout { boxes: TreeBox[]; problem?: string }

// d3.tree top-down: leaves evenly spaced, levels evenly spaced, every box one size. A tree too wide or deep
// for the rect at the floor size gives a problem and no boxes. Ids are "n0", "n1", … in breadth-first order.
export function treeLayout(root: TreeNode, rect: Rect): TreeLayout {
  const h = d3.hierarchy(root, (n) => n.children?.map((c) => c.node));
  const all = h.descendants();
  const id = new Map(all.map((n, i) => [n, `n${i}`]));
  const edgeOf = (n: d3.HierarchyNode<TreeNode>) => n.parent!.data.children!.find((c) => c.node === n.data)!.edge;
  const depth = h.height;
  d3.tree<TreeNode>().size([1, 1]).separation(() => 1)(h);
  const px = h as d3.HierarchyPointNode<TreeNode>;
  const xs = all.map((n) => (n as typeof px).x);
  const [lo, hi] = [Math.min(...xs), Math.max(...xs)];
  const frac = (n: d3.HierarchyNode<TreeNode>) => (hi > lo ? ((n as typeof px).x - lo) / (hi - lo) : 0.5);
  // Smallest share of the width between two neighbours on one level.
  let g = Infinity;
  for (let d = 0; d <= depth; d++) {
    const f = all.filter((n) => n.depth === d).map(frac).sort((a, b) => a - b);
    f.slice(1).forEach((v, i) => (g = Math.min(g, v - f[i])));
  }
  const bw = Math.min(MAX_W, g === Infinity ? MAX_W : (g * rect.w - SIDE_GAP) / (1 + g));
  if (bw < MIN_W) return { boxes: [], problem: `tree: too wide for ${rect.w}px at ${FLOOR}px text` };
  const levelH = depth ? (rect.h - BOX_H) / depth : 0;
  if (depth && levelH < BOX_H + EDGE_ROOM) return { boxes: [], problem: `tree: too deep for ${rect.h}px` };
  const boxes = all.map((n) => ({
    id: id.get(n)!,
    label: n.data.label,
    depth: n.depth,
    ...(n.parent ? { parent: id.get(n.parent)!, edge: edgeOf(n) } : {}),
    x: Math.round((rect.x + frac(n) * (rect.w - bw)) * 100) / 100,
    y: Math.round((rect.y + n.depth * levelH) * 100) / 100,
    w: Math.round(bw * 100) / 100,
    h: BOX_H,
  }));
  return { boxes };
}

// The node ids from the root along the edge labels. A label no edge below the current node carries
// stops the route and gives the error.
export function treeRoute(root: TreeNode, edges: string[]): { ids: string[]; error?: string } {
  const h = d3.hierarchy(root, (n) => n.children?.map((c) => c.node));
  const id = new Map(h.descendants().map((n, i) => [n.data, `n${i}`]));
  const ids = [id.get(root)!];
  let at = root;
  for (const e of edges) {
    const next = at.children?.find((c) => c.edge === e);
    if (!next) return { ids, error: `tree: no edge "${e}" after "${at.label}"` };
    ids.push(id.get(next.node)!);
    at = next.node;
  }
  return { ids };
}

// A decision tree: boxes joined by labelled lines. path() lights the route to its last edge in the accent colour.
export function decisionTree(ctx: Ctx, opts: TreeOpts): TreeHandle {
  const mode = opts.build ?? "all";
  const lay = treeLayout(opts.root, opts);
  if (lay.problem) ctx.problem(lay.problem);
  const byId = new Map(lay.boxes.map((b) => [b.id, b]));
  const els = new Map<string, HTMLElement>();
  const texts = new Map<string, HTMLElement>();
  for (const b of lay.boxes) {
    const el = document.createElement("div");
    el.setAttribute("data-k-tree-node", b.id);
    Object.assign(el.style, {
      position: "absolute", left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, boxSizing: "border-box",
      padding: "6px 10px", border: "3px solid var(--k-line)", borderRadius: "14px", background: "var(--k-surface)", color: "var(--k-fg)",
      display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
      font: `600 ${MAX_FONT}px/${LINE_H} var(--k-font)`, zIndex: "2",
    });
    const text = el.appendChild(document.createElement("div"));
    text.textContent = b.label;
    Object.assign(text.style, { overflowWrap: "anywhere", maxWidth: "100%" });
    ctx.html.append(el);
    gsap.set(el, { autoAlpha: 0 });
    els.set(b.id, el);
    texts.set(b.id, text);
  }

  // One line per non-root box, from its parent's bottom middle to its own top middle; the accent copy draws on top.
  const edges = new Map(lay.boxes.filter((b) => b.parent).map((b) => {
    const p = byId.get(b.parent!)!;
    const [x1, y1, x2, y2] = [p.x + p.w / 2, p.y + p.h, b.x + b.w / 2, b.y];
    const line = (stroke: string, width: string) => {
      const el = document.createElementNS(SVG, "path");
      el.setAttribute("d", `M ${x1} ${y1} L ${x2} ${y2}`);
      Object.assign(el.style, { fill: "none", stroke, strokeWidth: width, strokeLinecap: "round" });
      ctx.svg.append(el);
      gsap.set(el, { autoAlpha: 0 });
      return el;
    };
    const base = line("var(--k-line)", "4");
    const lit = line("var(--k-accent)", "7");
    const tag = document.createElement("div");
    tag.textContent = b.edge!;
    Object.assign(tag.style, {
      position: "absolute", left: `${(x1 + x2) / 2}px`, top: `${(y1 + y2) / 2}px`, translate: "-50% -50%", padding: "2px 10px",
      borderRadius: "8px", background: "var(--k-surface)", color: "var(--k-fg)", font: `600 ${FLOOR}px/${LINE_H} var(--k-font)`,
      whiteSpace: "nowrap", zIndex: "3",
    });
    ctx.html.append(tag);
    gsap.set(tag, { autoAlpha: 0 });
    return [b.id, { base, lit, tag }] as const;
  }));

  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    for (const b of lay.boxes) {
      const [el, text] = [els.get(b.id)!, texts.get(b.id)!];
      let size = MAX_FONT;
      const over = () => text.offsetHeight > LINE_H * size * 2 + 1 || text.offsetHeight > el.clientHeight - 12 || text.scrollWidth > text.clientWidth;
      for (; size > FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      el.style.fontSize = `${size}px`;
      if (over()) ctx.problem(`tree: label "${b.label}" too long`);
    }
  };

  const shown = new Set<string>();
  const reveal = (want: TreeBox[]): StepAdder => {
    want.forEach((b) => shown.add(b.id));
    return (tl) => {
      fit();
      const at = tl.duration();
      const d0 = Math.min(...want.map((b) => b.depth));
      // Deeper levels start later; an edge draws first and its box arrives with the line.
      for (const b of want) {
        const t = at + (b.depth - d0) * 0.5;
        const e = edges.get(b.id);
        if (e) {
          tl.set(e.base, { autoAlpha: 1 }, t);
          drawOn(e.base, { duration: 0.4, each: 0, at: t })(tl);
          tl.to([els.get(b.id)!, e.tag], { autoAlpha: 1, duration: 0.25 }, t + 0.3);
        } else tl.to(els.get(b.id)!, { autoAlpha: 1, duration: 0.4 }, t);
      }
      if (!want.length) tl.set({}, {}, at + 0.4);
    };
  };

  return {
    show: (tl) => reveal(lay.boxes.filter((b) => !shown.has(b.id)))(tl),
    level(k) {
      if (mode !== "levels") ctx.problem('tree: level() needs build: "levels"');
      return (tl) => reveal(lay.boxes.filter((b) => b.depth === k && !shown.has(b.id)))(tl);
    },
    path(labels) {
      const r = treeRoute(opts.root, labels);
      if (r.error) ctx.problem(r.error);
      const onNodes = new Set(r.ids);
      r.ids.forEach((i) => shown.add(i));
      return (tl) => {
        fit();
        const t = tl.duration();
        const newest = r.ids.length > 1 ? r.ids[r.ids.length - 1] : undefined;
        const set = (el: Element, vars: gsap.TweenVars) => tl.set(el, { ...vars, immediateRender: false }, t);
        for (const b of lay.boxes) {
          const on = onNodes.has(b.id);
          // Off the route: border and text blend to --k-muted (readable) instead of fading by opacity alone.
          // The route is shown whether or not an earlier step showed it; off-route visibility stays as it is.
          set(els.get(b.id)!, { borderColor: on ? "var(--k-accent)" : "var(--k-muted)", color: on ? "var(--k-fg)" : "var(--k-muted)", ...(on ? { autoAlpha: 1 } : {}) });
          const e = edges.get(b.id); // a box is on the route exactly when the edge into it is
          if (!e) continue;
          set(e.base, { stroke: on ? "var(--k-line)" : "var(--k-muted)", ...(on ? { autoAlpha: 1 } : {}) });
          set(e.tag, { color: on ? "var(--k-fg)" : "var(--k-muted)", ...(on ? { autoAlpha: 1 } : {}) });
          set(e.lit, { autoAlpha: on ? 1 : 0 });
          if (b.id === newest) drawOn(e.lit, { duration: 0.6, each: 0, at: t })(tl);
        }
        if (!newest) tl.set({}, {}, t + 0.4);
      };
    },
  };
}
