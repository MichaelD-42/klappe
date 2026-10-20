import { gsap } from "gsap";
import type { Ctx, SectionModule } from "klappe/types";

export { captioned } from "../10-chart/section";

// A scene heading, hidden until a step shows it.
export function heading(ctx: Ctx, text: string): HTMLElement {
  const h = document.createElement("h2");
  h.textContent = text;
  ctx.html.append(h);
  gsap.set(h, { autoAlpha: 0 });
  return h;
}

// A plain box with text at scene-local (x, y), visible; the caller hides it if a step should show it.
export function box(ctx: Ctx, x: number, y: number, w: number, h: number, text: string, style: Partial<CSSStyleDeclaration>): HTMLElement {
  const b = document.createElement("div");
  b.textContent = text;
  Object.assign(b.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`,
    boxSizing: "border-box", padding: "16px", fontSize: "32px", ...style,
  });
  ctx.html.append(b);
  return b;
}

const section: SectionModule = {
  transition: "fade",
  // The zoom section dives into the "Documents read" counter of the counts scene (canvas coordinates).
  build: (ctx) => {
    const r = ctx.canvas.rects.counts;
    return { countsAim: { x: r.x + 1150, y: r.y + 450, w: 300, h: 250 } };
  },
};
export default section;
