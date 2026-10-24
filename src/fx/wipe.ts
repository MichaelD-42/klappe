import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { image, type ScrimSide } from "./media";

export interface WipeOpts {
  before: { href: string; alt: string };
  after: { href: string; alt: string };
  rect?: Rect; // default: the full scene frame
  scrim?: number; // 0..1, a --k-scrim layer on both pictures for text on top
  scrimSide?: ScrimSide; // as for image()
}
export interface WipeHandle {
  show: StepAdder;
  to(f: number): StepAdder;
}

// Before and after: two pictures from media/ on one spot, cropped to cover it. The after picture is revealed
// from the left behind an --k-accent divider: to(0.5) shows half of it, to(1) all of it.
export function wipe(ctx: Ctx, opts: WipeOpts): WipeHandle {
  const rect = opts.rect ?? { x: 0, y: 0, w: ctx.rect.w, h: ctx.rect.h };
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-wipe", "");
  Object.assign(root.style, { position: "absolute", left: `${rect.x}px`, top: `${rect.y}px`, width: `${rect.w}px`, height: `${rect.h}px`, overflow: "hidden" });
  const inner = { ...ctx, html: root, rect: { ...rect, x: 0, y: 0 } };
  const box = { x: 0, y: 0, w: rect.w, h: rect.h };
  const before = image(inner, { ...opts.before, fit: "cover", rect: box, scrim: opts.scrim, scrimSide: opts.scrimSide });
  const after = image(inner, { ...opts.after, fit: "cover", rect: box, scrim: opts.scrim, scrimSide: opts.scrimSide });
  const clipped = root.lastElementChild as HTMLElement; // image() appends its box last
  const divider = root.appendChild(document.createElement("div"));
  divider.setAttribute("data-k-wipe-divider", "");
  Object.assign(divider.style, { position: "absolute", top: "0", left: "-2px", width: "4px", height: "100%", background: "var(--k-accent)" });
  const clip = (f: number) => `inset(0 ${(1 - f) * 100}% 0 0)`;
  gsap.set(clipped, { clipPath: clip(0) });
  gsap.set(divider, { autoAlpha: 0, x: 0 });

  let at = 0; // how much of the after picture shows at the end of the steps added so far
  return {
    show(tl) {
      before.show(tl);
      after.show(tl, "<");
      tl.fromTo(divider, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false }, "<");
    },
    to: (f) => (tl) => {
      const to = Math.min(1, Math.max(0, f));
      // immediateRender off: a later step's start values must not apply at load.
      const d = { duration: motion.step * 2, ease: "power2.inOut", immediateRender: false };
      tl.fromTo(clipped, { clipPath: clip(at) }, { clipPath: clip(to), ...d });
      tl.fromTo(divider, { x: at * rect.w }, { x: to * rect.w, ...d }, "<");
      at = to;
    },
  };
}
