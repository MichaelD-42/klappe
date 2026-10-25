import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface FocusOpts {
  dim?: number; // 0..1, the opacity of the items not in focus; default 0.35
}
export interface FocusHandle {
  on(item: number | Element): StepAdder;
  clear: StepAdder;
}

// One item stays lit while the others fade, in place: no layer over the scene (spotlight has one).
// Only the items' opacity tweens. Nothing is set in build, so the items keep the look their owner gives them.
// Reduced motion keeps the fade: nothing moves, so it is not motion.
// shortcut: the owner must have shown the items before the first on, and must not tween their opacity after it.
export function focus(ctx: Ctx, items: Element[], opts: FocusOpts = {}): FocusHandle {
  const { dim = 0.35 } = opts;
  const look = (lit: number | null, j: number) => (lit === null || lit === j ? 1 : dim);
  let cur: number | null = null; // the lit item at the end of the steps added so far; null: none
  const go = (pick: () => number | null): StepAdder => (tl) => {
    const next = pick();
    if (next === -1) return ctx.problem("focus: the item is not in the list");
    let first = true;
    items.forEach((el, j) => {
      const [a, b] = [look(cur, j), look(next, j)];
      if (a === b) return;
      // immediateRender off: a later step's start values must not apply at load. A step never starts with "<".
      tl.fromTo(el, { opacity: a }, { opacity: b, duration: motion.step, ease: "power2.inOut", immediateRender: false }, first ? undefined : "<");
      first = false;
    });
    cur = next;
  };
  return {
    on: (item) => go(() => (typeof item === "number" ? (item >= 0 && item < items.length ? item : -1) : items.indexOf(item))),
    clear: go(() => null),
  };
}
