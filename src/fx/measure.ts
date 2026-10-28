import type { gsap } from "gsap";
import type { Ctx, Rect } from "../types";

// An element's box in the scene's units, measured when a step is added (the timeline is built after
// layout), as a ratio of rects under the same stage and camera transform, so the camera does not matter.
// undefined when it has no size, for example while the window has none.
// content: the box of what the element holds (its text and children), not the element's own box: a code
// line's row spans the panel, its text does not.
export function measure(ctx: Ctx, target: Element, content = false): Rect | undefined {
  const hr = ctx.html.getBoundingClientRect();
  const range = content ? document.createRange() : undefined;
  range?.selectNodeContents(target);
  const tr = range ? range.getBoundingClientRect() : target.getBoundingClientRect();
  const s = hr.width / ctx.rect.w;
  if (!(s > 0) || !(tr.width > 0 || tr.height > 0)) return undefined;
  return { x: (tr.left - hr.left) / s, y: (tr.top - hr.top) / s, w: tr.width / s, h: tr.height / s };
}

// The lines an element's content runs over, one box each, top to bottom: a phrase that wraps gives two.
// Text fragments on one line (a nested span, a space) merge into that line's box.
export function lines(ctx: Ctx, target: Element): Rect[] {
  const range = document.createRange();
  range.selectNodeContents(target);
  const out: DOMRect[] = [];
  for (const q of range.getClientRects()) {
    if (!(q.width > 0)) continue;
    const same = out.find((o) => Math.abs(o.top + o.height / 2 - (q.top + q.height / 2)) < Math.min(o.height, q.height) / 2);
    if (!same) out.push(DOMRect.fromRect(q));
    else {
      const [l, t, r, b] = [Math.min(same.left, q.left), Math.min(same.top, q.top), Math.max(same.right, q.right), Math.max(same.bottom, q.bottom)];
      Object.assign(same, { x: l, y: t, width: r - l, height: b - t });
    }
  }
  const hr = ctx.html.getBoundingClientRect();
  const s = hr.width / ctx.rect.w;
  if (!(s > 0)) return [];
  return out.sort((a, b) => a.top - b.top).map((q) => ({ x: (q.left - hr.left) / s, y: (q.top - hr.top) / s, w: q.width / s, h: q.height / s }));
}

// Step adders run while the timeline is built, at load. To see a target where the steps added so far leave it
// (a box an earlier step moved, a code line a diff moved), seek to the timeline's current end, look, seek back,
// as shatter does (DECISIONS R12).
export function atEnd<T>(tl: gsap.core.Timeline, look: () => T): T {
  const t = tl.time();
  tl.time(tl.duration(), false);
  try {
    return look();
  } finally {
    tl.time(t, false);
  }
}
