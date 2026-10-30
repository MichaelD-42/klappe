import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";
import { token, typeSize } from "./draw";

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
const STRESS = 1.15; // a key word's size, in the font size of the text around it

// The units that rise one after another: the source lines, or the words. Never the rendered lines, so the
// reveal does not depend on where a font wraps. Empty lines are dropped. Key words keep their **markers**;
// by word, a marked phrase splits into marked words: "**ship often**" gives "**ship**", "**often**". Pure.
export function revealUnits(text: string | string[], by: "line" | "word" = "line"): string[] {
  const lines = (Array.isArray(text) ? text : text.split("\n")).map((l) => l.trim()).filter(Boolean);
  if (by === "line") return lines;
  const marked = (l: string) => l.replace(/\*\*(.+?)\*\*/g, (_, k: string) => k.trim().split(/\s+/).map((w) => `**${w}**`).join(" "));
  return lines.flatMap((l) => marked(l).split(/\s+/));
}

// A unit's text in parts, the **marked** ones as key. Pure.
export function keyParts(unit: string): { text: string; key: boolean }[] {
  return unit.split(/\*\*(.+?)\*\*/).map((text, i) => ({ text, key: i % 2 === 1 })).filter((p) => p.text);
}

// A statement or a quote whose lines (or words) rise in one after another, in --k-fg. Every unit is laid
// out at build; only its opacity and y tween, so nothing reflows. Words marked **bold** in the text are key:
// as their unit rises they grow and turn --k-accent. Reduced motion: the whole text fades in, key words
// already grown and in the accent.
export function reveal(ctx: Ctx, opts: RevealOpts): RevealHandle {
  const { x, y, size = typeSize("body", 56), by = "line", delay = 0 } = opts;
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-reveal", "");
  Object.assign(root.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, width: `${opts.w ?? ctx.rect.w - x}px`,
    font: `600 ${size}px/1.3 var(--k-font)`, color: "var(--k-fg)",
  });
  const keys: HTMLElement[][] = []; // per unit
  const units = revealUnits(opts.text, by).map((t) => {
    // A word is inline-block, so it can move; the space after it lets the words wrap.
    const u = root.appendChild(document.createElement(by === "line" ? "div" : "span"));
    const own: HTMLElement[] = [];
    for (const p of keyParts(t)) {
      if (!p.key) u.append(p.text);
      else {
        // Laid out at its stressed size, so the line never reflows; it starts scaled down and grows into its room.
        const k = u.appendChild(document.createElement("span"));
        k.textContent = p.text;
        k.setAttribute("data-k-key", "");
        Object.assign(k.style, { display: "inline-block", fontSize: `${STRESS}em`, transformOrigin: "50% 80%" });
        own.push(k);
      }
    }
    keys.push(own);
    if (by === "word") (u.style.display = "inline-block"), root.append(" ");
    return u;
  });
  const all = keys.flat();
  // GSAP cannot tween var(): both ends are the tokens' resolved colours, read at build.
  const fg = token(root, "--k-fg");
  const accent = token(root, "--k-accent");
  // y: 0 written at load as well: a seek leaves GSAP's translate on each unit, so play must start with it too.
  if (ctx.reducedMotion) gsap.set(root, { autoAlpha: 0 }), all.length && gsap.set(all, { scale: 1, color: accent });
  else gsap.set(units, { autoAlpha: 0, y: 0 }), all.length && gsap.set(all, { scale: 1 / STRESS, color: fg });
  return {
    el: root,
    run(tl) {
      if (ctx.reducedMotion) return void tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, delay, immediateRender: false });
      const at = tl.duration();
      tl.fromTo(units, { autoAlpha: 0, y: size * 0.5 }, {
        autoAlpha: 1, y: 0, duration: motion.step * 1.5, ease: "power2.out", stagger: GAP[by], delay, immediateRender: false,
      }, at);
      // A key word grows as its unit settles: the stress lands as the word is read.
      keys.forEach((own, i) => {
        if (own.length)
          tl.fromTo(own, { scale: 1 / STRESS, color: fg }, { scale: 1, color: accent, duration: motion.step * 1.5, ease: "back.out(2)", immediateRender: false }, at + delay + i * GAP[by] + 0.3);
      });
    },
  };
}
