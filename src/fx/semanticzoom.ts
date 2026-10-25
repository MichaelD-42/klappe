import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";

export interface ZoomBox {
  label: string;
  children?: ZoomBox[];
}
export type SemanticZoomOpts = { boxes: ZoomBox[] } & Rect;
export interface SemanticZoomHandle {
  show: StepAdder;
  into(path: string[]): StepAdder;
  out: StepAdder;
  box(path: string[]): HTMLElement;
}

export interface ZoomCell { id: string; label: string; depth: number; parent?: string; leaf: boolean; font: number; x: number; y: number; w: number; h: number }

const FONT = 32; // a label's size on screen at the level it shows, scene px
const HEADER = 2.2; // a box's header band, in its label's font sizes: its line and a gap above the children
const PAD = 0.04; // a box's inner margin, as a share of its width
const GAP = 0.06; // between boxes, as a share of a cell's width
const VIEW = 1.25; // the camera's view on a box, as a multiple of it: a margin all round
const ASPECT = 16 / 9;

// The view the camera takes on a box, in the same units: the box with VIEW margin, at the frame's aspect.
export const zoomView = (b: Rect): Rect => {
  const [w, h] = [Math.max(b.w, b.h * ASPECT) * VIEW, Math.max(b.h, b.w / ASPECT) * VIEW];
  return { x: b.x + b.w / 2 - w / 2, y: b.y + b.h / 2 - h / 2, w, h };
};

// n boxes of the frame's aspect in a grid inside `area`, as large as they fit, the grid centred.
function grid(n: number, area: Rect): Rect[] {
  let best = { cols: 1, w: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    const w = Math.min(area.w / (cols + (cols - 1) * GAP), area.h / (rows + (rows - 1) * GAP) * ASPECT);
    if (w > best.w) best = { cols, w };
  }
  const { cols, w } = best;
  const [h, rows] = [w / ASPECT, Math.ceil(n / cols)];
  const [gw, gh] = [cols * w + (cols - 1) * GAP * w, rows * h + (rows - 1) * GAP * w];
  return Array.from({ length: n }, (_, i) => {
    const [c, r] = [i % cols, Math.floor(i / cols)];
    const inRow = Math.min(cols, n - r * cols); // a short last row is centred too
    const rowW = inRow * w + (inRow - 1) * GAP * w;
    return { x: area.x + (area.w - gw) / 2 + (gw - rowW) / 2 + c * w * (1 + GAP), y: area.y + (area.h - gh) / 2 + r * (h + GAP * w), w, h };
  });
}

// Every box, nested: the top level in a grid in rect, each box's children in a grid under its header. A box's
// label is sized so that it reads FONT scene px with the camera on its parent's view (the scene's frame, frameW
// wide, for the top level). Ids are the labels from the top joined with "/". Pure, for tests.
export function zoomLayout(boxes: ZoomBox[], rect: Rect, frameW = 1920): ZoomCell[] {
  const out: ZoomCell[] = [];
  const place = (list: ZoomBox[], area: Rect, depth: number, font: number, parent?: ZoomCell) => {
    grid(list.length, area).forEach((r, i) => {
      const b = list[i];
      const id = parent ? `${parent.id}/${b.label}` : b.label;
      const cell: ZoomCell = { id, label: b.label, depth, ...(parent ? { parent: parent.id } : {}), leaf: !b.children?.length, font, ...r };
      out.push(cell);
      if (!b.children?.length) return;
      const pad = r.w * PAD;
      const head = font * HEADER;
      // The camera on this box is frameW / view.w times closer than on the scene's frame: its children's labels shrink by that.
      place(b.children, { x: r.x + pad, y: r.y + head, w: r.w - 2 * pad, h: r.h - head - pad }, depth + 1, (FONT * zoomView(r).w) / frameW, cell);
    });
  };
  place(boxes, rect, 0, FONT);
  return out;
}

// Boxes in boxes on the canvas: into(path) flies the camera into one box while the rest of its level fades,
// and the box's insides build as it lands; out flies back up a level. Each level's labels read FONT px at their zoom.
export function semanticZoom(ctx: Ctx, opts: SemanticZoomOpts): SemanticZoomHandle {
  const cells = zoomLayout(opts.boxes, opts, ctx.rect.w);
  const els = new Map<string, HTMLElement>();
  for (const c of cells) {
    const el = ctx.html.appendChild(document.createElement("div"));
    el.dataset.kZoomBox = c.id;
    const line = (3 * c.font) / FONT; // 3 px on screen at its level
    Object.assign(el.style, {
      position: "absolute", left: `${c.x}px`, top: `${c.y}px`, width: `${c.w}px`, height: `${c.h}px`, boxSizing: "border-box",
      border: `${line}px solid var(--k-line)`, borderRadius: `${c.font * 0.4}px`, background: "var(--k-surface)", color: "var(--k-fg)",
      font: `600 ${c.font}px/1.2 var(--k-font)`, padding: `${c.font * 0.4}px ${c.w * PAD}px`, display: "flex",
      alignItems: c.leaf ? "center" : "flex-start", justifyContent: c.leaf ? "center" : "flex-start", textAlign: "center",
    });
    const text = el.appendChild(document.createElement("div"));
    text.textContent = c.label;
    Object.assign(text.style, { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" });
    gsap.set(el, { autoAlpha: 0 });
    gsap.set(text, { autoAlpha: 1 }); // the state into() fades a parent's label from, so a fresh load matches a seek
    els.set(c.id, el);
  }
  // A box's children are built after it, so they paint over its fill.
  const kids = (id?: string) => cells.filter((c) => c.parent === id).map((c) => els.get(c.id)!);
  const byId = new Map(cells.map((c) => [c.id, c]));
  const label = (id?: string) => (id ? [els.get(id)!.firstElementChild!] : []);
  const abs = (r: Rect): Rect => ({ x: ctx.rect.x + r.x, y: ctx.rect.y + r.y, w: r.w, h: r.h });

  let at: string | undefined; // the box the camera is in, as the steps are added
  let checked = false;
  const check = () => {
    if (checked) return;
    checked = true;
    for (const c of cells) {
      const t = els.get(c.id)!.firstElementChild as HTMLElement;
      if (t.scrollWidth > t.clientWidth + 1) ctx.problem(`semanticZoom: label "${c.label}" too long`);
    }
  };
  const fade = (tl: gsap.core.Timeline, list: Element[], autoAlpha: number, t: number) =>
    list.length && tl.to(list, { autoAlpha, duration: motion.step, stagger: autoAlpha ? 0.08 : 0 }, t);

  return {
    show(tl) {
      check();
      fade(tl, kids(undefined), 1, tl.duration());
    },
    into(path) {
      const id = path.join("/");
      const c = byId.get(id);
      if (!c) ctx.problem(`semanticZoom: no box "${id}"`);
      else if (c.parent !== at) ctx.problem(`semanticZoom: into "${id}" from ${at ? `"${at}"` : "the top"}; go one level at a time`);
      else if (c.leaf) ctx.problem(`semanticZoom: "${id}" has nothing inside`);
      const ok = c && c.parent === at && !c.leaf;
      if (ok) at = id;
      return (tl) => {
        check();
        if (!ok) return;
        const t = tl.duration();
        // The rest of this level and the parent's label (off the new view) fade as the camera leaves; the box turns
        // --k-accent; its insides build as it lands.
        fade(tl, [...kids(c.parent).filter((e) => e !== els.get(id)), ...label(c.parent)], 0, t);
        tl.set(els.get(id)!, { borderColor: "var(--k-accent)" }, t);
        ctx.camera.to(tl, abs(zoomView(c)), { at: t });
        fade(tl, kids(id), 1, Math.max(t, tl.duration() - motion.step));
      };
    },
    out(tl) {
      check();
      const c = at ? byId.get(at)! : undefined;
      if (!c) return ctx.problem("semanticZoom: out at the top level");
      at = c.parent;
      const t = tl.duration();
      fade(tl, kids(c.id), 0, t);
      tl.set(els.get(c.id)!, { borderColor: "var(--k-line)" }, t);
      ctx.camera.to(tl, c.parent ? abs(zoomView(byId.get(c.parent)!)) : ctx.rect, { at: t });
      fade(tl, [...kids(c.parent).filter((e) => e !== els.get(c.id)), ...label(c.parent)], 1, Math.max(t, tl.duration() - motion.step));
    },
    box(path) {
      const e = els.get(path.join("/"));
      if (!e) throw new Error(`semanticZoom: no box "${path.join("/")}"`);
      return e;
    },
  };
}
