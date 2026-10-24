import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface RevealOpts {
  text: string | string[]; // a string's lines are its "\n" breaks (a list item's source lines); a list gives one line each
  x: number; // top-left corner, scene-local
  y: number;
  w?: number; // the width the text wraps at; default: to the scene's right edge
  size?: number; // font size in scene px; default 56
  by?: "line" | "word"; // what rises as one; default "line"
  delay?: number; // seconds the step holds before the first unit rises; default 0. For a first step that plays under a section fade
}
export interface RevealHandle {
  run: StepAdder;
  el: HTMLElement;
}

const GAP = { line: 0.3, word: 0.15 }; // seconds between one unit's start and the next

// The units that rise one after another: the source lines, or the words. Never the rendered lines, so the
// reveal does not depend on where a font wraps. Empty lines are dropped. Pure.
export function revealUnits(text: string | string[], by: "line" | "word" = "line"): string[] {
  const lines = (Array.isArray(text) ? text : text.split("\n")).map((l) => l.trim()).filter(Boolean);
  return by === "line" ? lines : lines.flatMap((l) => l.split(/\s+/));
}

// A statement or a quote whose lines (or words) rise in one after another, in --k-fg. Every unit is laid
// out at build; only its opacity and y tween, so nothing reflows. Reduced motion: the whole text fades in.
export function reveal(ctx: Ctx, opts: RevealOpts): RevealHandle {
  const { x, y, size = 56, by = "line", delay = 0 } = opts;
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-reveal", "");
  Object.assign(root.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, width: `${opts.w ?? ctx.rect.w - x}px`,
    font: `600 ${size}px/1.3 var(--k-font)`, color: "var(--k-fg)",
  });
  const units = revealUnits(opts.text, by).map((t) => {
    // A word is inline-block, so it can move; the space after it lets the words wrap.
    const u = root.appendChild(document.createElement(by === "line" ? "div" : "span"));
    u.textContent = t;
    if (by === "word") (u.style.display = "inline-block"), root.append(" ");
    return u;
  });
  // y: 0 written at load as well: a seek leaves GSAP's translate on each unit, so play must start with it too.
  if (ctx.reducedMotion) gsap.set(root, { autoAlpha: 0 });
  else gsap.set(units, { autoAlpha: 0, y: 0 });
  return {
    el: root,
    run(tl) {
      if (ctx.reducedMotion) return void tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, delay, immediateRender: false });
      tl.fromTo(units, { autoAlpha: 0, y: size * 0.5 }, {
        autoAlpha: 1, y: 0, duration: motion.step * 1.5, ease: "power2.out", stagger: GAP[by], delay, immediateRender: false,
      });
    },
  };
}
