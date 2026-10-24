import type { Ctx, Rect } from "../types";

// An element's box in the scene's units, measured when a step is added (the timeline is built after
// layout), as a ratio of rects under the same stage and camera transform, so the camera does not matter.
// undefined when it has no size, for example while the window has none.
export function measure(ctx: Ctx, target: Element): Rect | undefined {
  const hr = ctx.html.getBoundingClientRect();
  const tr = target.getBoundingClientRect();
  const s = hr.width / ctx.rect.w;
  if (!(s > 0) || !(tr.width > 0 || tr.height > 0)) return undefined;
  return { x: (tr.left - hr.left) / s, y: (tr.top - hr.top) / s, w: tr.width / s, h: tr.height / s };
}
