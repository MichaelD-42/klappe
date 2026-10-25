import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";
import { lineDiff } from "./code";

export interface RedlineOpts {
  before: string; // the text as it was
  after: string; // the text as it is now
  x: number; // top-left corner, scene-local
  y: number;
  w?: number; // the width the text wraps at; default: to the scene's right edge
  size?: number; // font size in scene px; default 48
}
export interface RedlineHandle {
  show: StepAdder; // fades in the before text
  apply: StepAdder; // strikes the deleted words, inserts the new ones, marked
  clean: StepAdder; // removes the marks and the deleted words: the after text, plain
  el: HTMLElement;
}

export type WordOp = { op: "keep" | "del" | "add"; word: string };

const words = (s: string) => s.split(/\s+/).filter(Boolean);

// A word diff of two texts by longest common subsequence (lineDiff on the words). At a fork, deletions come
// before additions, so a replaced word reads "old new". Pure.
export function wordDiff(before: string, after: string): WordOp[] {
  const [a, b] = [words(before), words(after)];
  return lineDiff(a, b).map((o) => (o.op === "add" ? { op: "add", word: b[o.to] } : { op: o.op, word: a[o.from] }));
}

// A max-width that no word of n characters reaches: the width tweens to and from it, so nothing is measured.
// shortcut: the reveal ends a little before the tween does, measure the word if that ever shows.
const roomy = (n: number) => `${(n + 1) * 0.75}em`;

// Prose changes as a redline: deleted words struck through in --k-bad, new words underlined on a --k-ok tint.
// Every word of both texts is laid out at build. An inserted word starts at max-width 0 and grows in; a deleted
// word collapses the same way in clean. The text reflows only as a function of those tweens, so seek equals play.
// Reduced motion: the marks and words fade in and out in place, the widths cut at the start of the fade.
export function redline(ctx: Ctx, opts: RedlineOpts): RedlineHandle {
  const { x, y, size = 48 } = opts;
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-redline", "");
  root.setAttribute("aria-label", opts.after);
  Object.assign(root.style, {
    position: "absolute", left: `${x}px`, top: `${y}px`, width: `${opts.w ?? ctx.rect.w - x}px`,
    font: `600 ${size}px/1.4 var(--k-font)`, color: "var(--k-fg)",
    isolation: "isolate", // the tint (z-index -1) stays behind its word, not behind the scene
  });
  const bar = (parent: HTMLElement, css: Partial<CSSStyleDeclaration>) => {
    const b = parent.appendChild(document.createElement("span"));
    Object.assign(b.style, { position: "absolute", left: "-0.05em", right: "-0.05em", transformOrigin: "left center", ...css });
    return b;
  };
  const del: HTMLElement[] = [], add: HTMLElement[] = [], strikes: HTMLElement[] = [], marks: HTMLElement[] = [];
  for (const o of wordDiff(opts.before, opts.after)) {
    // The space sits inside the word's box (a no-break space), so a collapsed word leaves no gap.
    const w = root.appendChild(document.createElement("span"));
    w.setAttribute(`data-k-redline-${o.op}`, "");
    Object.assign(w.style, { display: "inline-block", verticalAlign: "top", whiteSpace: "nowrap", overflow: "hidden" });
    const t = w.appendChild(document.createElement("span"));
    t.style.position = "relative";
    if (o.op === "add") {
      marks.push(bar(t, { top: "0.1em", bottom: "0.1em", background: "var(--k-ok)", zIndex: "-1" }));
      marks.push(bar(t, { bottom: "0.08em", height: "0.08em", background: "var(--k-ok)" }));
    }
    t.append(o.word);
    if (o.op === "del") strikes.push(bar(t, { top: "52%", height: "0.08em", background: "var(--k-bad)" }));
    w.append(" ");
    (o.op === "del" ? del : o.op === "add" ? add : []).push(w);
    if (o.op !== "keep") w.dataset.room = roomy(o.word.length);
  }
  const room = (_: number, e: HTMLElement) => e.dataset.room!; // GSAP calls it with (index, target)
  const markAlpha = (i: number) => (i % 2 ? 1 : 0.25); // marks go tint, underline, tint, …
  gsap.set(root, { autoAlpha: 0 });
  gsap.set(add, { maxWidth: 0, opacity: 0 });
  gsap.set(del, { maxWidth: room, opacity: 1 });
  gsap.set([...strikes, ...marks], { scaleX: 0, opacity: 1 });
  gsap.set(marks, { opacity: markAlpha });
  const rm = ctx.reducedMotion;
  const d = motion.step * 1.5;
  // Skips an empty list: a text with no deletions (or no insertions) adds no tween for them.
  const tw = (tl: gsap.core.Timeline, t: HTMLElement[], from: gsap.TweenVars, to: gsap.TweenVars, at: number) => {
    if (t.length) tl.fromTo(t, from, { ...to, duration: d, ease: "power2.inOut", immediateRender: false }, at);
  };
  return {
    el: root,
    show(tl) {
      tl.fromTo(root, { autoAlpha: 0 }, { autoAlpha: 1, duration: motion.step, immediateRender: false });
    },
    apply(tl) {
      const at = tl.duration();
      tw(tl, del, { opacity: 1 }, { opacity: 0.6 }, at);
      tw(tl, add, { opacity: 0 }, { opacity: 1 }, at);
      if (rm) {
        // The marks fade in at full length; the inserted words take their room at once.
        if (add.length) tl.set(add, { maxWidth: room }, at);
        tw(tl, strikes, { scaleX: 1, opacity: 0 }, { scaleX: 1, opacity: 1 }, at);
        tw(tl, marks, { scaleX: 1, opacity: 0 }, { scaleX: 1, opacity: markAlpha }, at);
        return;
      }
      tw(tl, add, { maxWidth: 0 }, { maxWidth: room }, at);
      tw(tl, strikes, { scaleX: 0 }, { scaleX: 1 }, at);
      tw(tl, marks, { scaleX: 0 }, { scaleX: 1 }, at);
    },
    clean(tl) {
      const at = tl.duration();
      tw(tl, del, { opacity: 0.6 }, { opacity: 0 }, at);
      if (rm) { if (del.length) tl.set(del, { maxWidth: 0 }, at + d); }
      else tw(tl, del, { maxWidth: room }, { maxWidth: 0 }, at);
      tw(tl, marks, { opacity: markAlpha }, { opacity: 0 }, at);
    },
  };
}
