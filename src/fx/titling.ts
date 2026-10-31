import { gsap } from "gsap";
import { t } from "../strings";
import { motion } from "../theme";
import type { Ctx, Rect, StepAdder } from "../types";
import { typeSize } from "./draw";

const PX_PER_S = 90; // the roll's speed
const MAX_ROLL = 40; // s: a long list scrolls faster rather than longer

export interface LowerThirdOpts {
  name: string;
  role?: string;
  rect?: Rect; // default: `ctx.safe`, the scene frame inside the deck's safe area; the bar sits at its lower left
}
export interface LowerThirdHandle {
  el: HTMLElement;
  show: StepAdder;
  hide: StepAdder;
}

export function lowerThird(ctx: Ctx, opts: LowerThirdOpts): LowerThirdHandle {
  const r = opts.rect ?? ctx.safe;
  const bar = ctx.html.appendChild(document.createElement("div"));
  bar.setAttribute("data-k-lowerthird", "");
  Object.assign(bar.style, {
    position: "absolute",
    left: `${r.x}px`,
    bottom: `${ctx.rect.h - r.y - r.h}px`,
    maxWidth: `${r.w}px`,
    padding: "16px 32px",
    background: "var(--k-surface)",
    borderLeft: "8px solid var(--k-accent)",
    color: "var(--k-fg)",
  });
  const line = (text: string, font: string, color = "var(--k-fg)") => {
    const e = bar.appendChild(document.createElement("div"));
    e.textContent = text; // text, never HTML
    e.style.cssText = `font:${font};color:${color}`;
  };
  line(opts.name, `700 ${typeSize("title", 44)}px/1.2 var(--k-font-heading)`);
  if (opts.role) line(opts.role, `500 ${typeSize("label", 28)}px/1.3 var(--k-font)`, "var(--k-muted)");
  // Off the frame's left edge until shown; xPercent is the bar's own width, so any name length clears it.
  gsap.set(bar, { autoAlpha: 0, x: -r.x, xPercent: -100 });
  return {
    el: bar,
    show: (tl) => void tl.to(bar, { autoAlpha: 1, x: 0, xPercent: 0, duration: motion.step, ease: "power2.out" }),
    hide: (tl) => void tl.to(bar, { autoAlpha: 0, x: -r.x, xPercent: -100, duration: motion.step, ease: "power2.in" }),
  };
}

export interface EndRollOpts {
  title?: string;
  thanks?: string[]; // lines under the sources
  rect?: Rect; // default: `ctx.safe`, the scene frame inside the deck's safe area
}
export interface EndRollHandle {
  el: HTMLElement;
  show: StepAdder;
}

export function endRoll(ctx: Ctx, opts: EndRollOpts = {}): EndRollHandle {
  const r = opts.rect ?? ctx.safe;
  const box = ctx.html.appendChild(document.createElement("div"));
  box.setAttribute("data-k-endroll", "");
  Object.assign(box.style, { position: "absolute", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, overflow: "hidden", color: "var(--k-fg)", textAlign: "center" });
  const inner = box.appendChild(document.createElement("div"));
  inner.setAttribute("data-k-endroll-inner", "");
  const add = (parent: HTMLElement, text: string, font: string, color = "var(--k-fg)", attr?: string) => {
    const e = parent.appendChild(document.createElement("div"));
    e.textContent = text; // text, never HTML
    e.style.cssText = `font:${font};color:${color};margin:0 0 12px;break-inside:avoid`;
    if (attr) e.setAttribute(attr, "");
  };
  if (opts.title) add(inner, opts.title, `800 ${typeSize("title", 64)}px/1.2 var(--k-font-heading)`, "var(--k-accent)");
  const list = inner.appendChild(document.createElement("div"));
  list.style.margin = "24px 0 36px"; // filled in the step: the deck's other scenes build after this one
  for (const line of opts.thanks ?? []) add(inner, line, `600 ${typeSize("label", 32)}px/1.3 var(--k-font)`, "var(--k-accent-2)");
  gsap.set(box, { autoAlpha: 0 });
  let filled = false;
  return {
    el: box,
    show(tl) {
      // Every scene has built by the time a step is added (pass 2), so the list is the deck's whole.
      if (!filled) {
        filled = true;
        if (ctx.deck.sources.length) add(list, t("source", ctx.deck.lang), `700 ${typeSize("label", 28)}px/1.3 var(--k-font)`, "var(--k-muted)");
        for (const s of ctx.deck.sources) add(list, s, `500 ${typeSize("label", 32)}px/1.3 var(--k-font)`, "var(--k-fg)", "data-k-source");
      }
      tl.to(box, { autoAlpha: 1, duration: motion.step });
      if (ctx.reducedMotion) {
        // The list stands still, whole: a long one flows into columns (up to 6) until it fits the rect.
        for (let k = 2; inner.offsetHeight > r.h && k <= 6; k++) list.style.columnCount = String(k);
        return;
      }
      const h = inner.offsetHeight;
      tl.fromTo(inner, { y: r.h }, { y: -h, duration: Math.min(MAX_ROLL, (r.h + h) / PX_PER_S), ease: "none" });
    },
  };
}
