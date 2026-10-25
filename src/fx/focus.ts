import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface FocusOpts {
  dim?: number; // 0..1, the opacity of the items not in focus; default 0.35
}
export interface RackFocusOpts {
  dim?: number; // 0..1, the opacity of the items out of focus; default 0.6
  blur?: number; // px of blur on the items out of focus; default 6
}
export interface FocusHandle {
  on(item: number | Element): StepAdder;
  clear: StepAdder;
}

// on and clear tween each item from its look at the end of the steps added so far to its look now.
// off: the look of an item out of focus; lit is the same keys at rest.
function lights(ctx: Ctx, name: string, items: Element[], off: gsap.TweenVars): FocusHandle {
  const lit: gsap.TweenVars = { opacity: 1, ...(off.filter ? { filter: "blur(0px)" } : {}) };
  const look = (on: number | null, j: number) => (on === null || on === j ? lit : off);
  let cur: number | null = null; // the lit item at the end of the steps added so far; null: none
  const go = (pick: () => number | null): StepAdder => (tl) => {
    const next = pick();
    if (next === -1) return ctx.problem(`${name}: the item is not in the list`);
    let first = true;
    items.forEach((el, j) => {
      const [a, b] = [look(cur, j), look(next, j)];
      if (a === b) return;
      // immediateRender off: a later step's start values must not apply at load. A step never starts with "<".
      tl.fromTo(el, { ...a }, { ...b, duration: motion.step, ease: "power2.inOut", immediateRender: false }, first ? undefined : "<");
      first = false;
    });
    cur = next;
  };
  return {
    on: (item) => go(() => (typeof item === "number" ? (item >= 0 && item < items.length ? item : -1) : items.indexOf(item))),
    clear: go(() => null),
  };
}

// One item stays lit while the others fade, in place: no layer over the scene (spotlight has one).
// Only the items' opacity tweens. Nothing is set in build, so the items keep the look their owner gives them.
// Reduced motion keeps the fade: nothing moves, so it is not motion.
// shortcut: the owner must have shown the items before the first on, and must not tween their opacity after it;
// read each item's start opacity when the step is added if a deck ever needs both.
export function focus(ctx: Ctx, items: Element[], opts: FocusOpts = {}): FocusHandle {
  return lights(ctx, "focus", items, { opacity: opts.dim ?? 0.35 });
}

// A focus pull: the items out of focus blur and dim, as a lens's depth of field does. The blur is a CSS filter on
// each item, never on a layer, so only the items' own boxes are redrawn while it tweens (perf: docs/perf-m2.md).
// Same rules as focus, and it owns the items' filter too. Reduced motion keeps it: nothing moves.
export function rackFocus(ctx: Ctx, items: Element[], opts: RackFocusOpts = {}): FocusHandle {
  // A seek back to before a step reverts its tweens to the inline style: "blur(0px)", not none, as a walk leaves it.
  if (items.length) gsap.set(items, { filter: "blur(0px)" });
  return lights(ctx, "rackFocus", items, { opacity: opts.dim ?? 0.6, filter: `blur(${opts.blur ?? 6}px)` });
}
