import { gsap } from "gsap";
import type { Ctx, SectionModule } from "klappe/types";

// The chip both sections show. The shared data-k-match key lets the next section's magic move fly it.
export function planChip(ctx: Ctx, x: number, y: number, size: number): HTMLElement {
  const c = document.createElement("div");
  c.textContent = "Q3 plan";
  c.dataset.kMatch = "plan";
  Object.assign(c.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, padding: `${size / 4}px ${size / 2}px`, borderRadius: `${size / 6}px`,
    fontSize: `${size}px`, fontWeight: "700", background: "var(--k-accent)", color: "var(--k-bg)",
  });
  ctx.html.append(c);
  gsap.set(c, { autoAlpha: 0 });
  return c;
}

const section: SectionModule = { transition: "fade" };
export default section;
