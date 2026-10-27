import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, Point, Rect, StepAdder } from "../types";
import { typed } from "./crt";
import { measure } from "./measure";

export interface PointerOpts {
  at: Point; // where the pointer shows, scene units
}
export interface PointerHandle {
  el: HTMLElement;
  show: StepAdder;
  move(to: Element | Point, opts?: { duration?: number }): StepAdder;
  click: StepAdder;
  type(field: Element | Rect, text: string): StepAdder;
  drag(item: Element, to: Element | Point, opts?: { duration?: number }): StepAdder; // grab the item, carry it, let go
  hide: StepAdder;
}

const ARROW = "M0 0 L0 34 L9 26 L15 39 L21 36 L15 24 L27 24 Z"; // the classic arrow, its tip at 0 0
const SCALE = 1.5;
const CPS = 14; // characters a second, a brisk typist
const CARET = "|";
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)

// The centre of an element (measured when the step is added) or a point, scene units.
function spot(ctx: Ctx, to: Element | Point): Point | undefined {
  if (!(to instanceof Element)) return to;
  const r = measure(ctx, to);
  return r && { x: r.x + r.w / 2, y: r.y + r.h / 2 };
}

// A mouse pointer for a UI walkthrough: it moves to a target on a curve, clicks with a ripple, and types into a
// field. It sits above the scene. Its place is kept as the steps are added, so each move starts where the last ended.
export function pointer(ctx: Ctx, opts: PointerOpts): PointerHandle {
  const el = ctx.html.appendChild(document.createElement("div"));
  el.dataset.kPointer = "";
  Object.assign(el.style, { position: "absolute", left: "0", top: "0", width: "0", height: "0", zIndex: "7", pointerEvents: "none" });
  el.innerHTML = `<svg width="${42 * SCALE}" height="${42 * SCALE}" viewBox="-2 -2 42 42" style="overflow:visible;display:block"><path d="${ARROW}" style="fill:var(--k-fg);stroke:var(--k-bg);stroke-width:2.5;stroke-linejoin:round"/></svg>`;
  gsap.set(el, { x: opts.at.x, y: opts.at.y, scale: 1, transformOrigin: "0 0", autoAlpha: 0 });
  let pos = opts.at; // where the pointer is at the end of the steps added so far
  let focused: HTMLElement | undefined; // the field typed into last: it loses its accent border when the next one gets it
  const moved = new Map<Element, Point>(); // how far drag has carried each item, after the steps added so far
  const glide = (tl: gsap.core.Timeline, targets: Element[], to: (e: Element) => Point, duration: number) => {
    // x and y on different eases: the path bows, as a hand's does.
    tl.to(targets, { x: (_, e) => to(e).x, duration, ease: "power2.inOut" });
    tl.to(targets, { y: (_, e) => to(e).y, duration, ease: "power1.inOut" }, "<");
  };

  return {
    el,
    show: (tl) => void tl.to(el, { autoAlpha: 1, duration: motion.step }),
    hide: (tl) => void tl.to(el, { autoAlpha: 0, duration: motion.step }),
    move: (to, o = {}) => (tl) => {
      const p = spot(ctx, to);
      if (!p) return ctx.problem("pointer: move target has no size to measure");
      glide(tl, [el], () => p, o.duration ?? 0.8);
      pos = p;
    },
    drag: (item, to, o = {}) => {
      if (!moved.has(item)) gsap.set(item, { x: 0, y: 0 }); // where a seek back before the first drag leaves it
      return (tl) => {
        const [from, p] = [spot(ctx, item), spot(ctx, to)];
        if (!from || !p) return ctx.problem("pointer: drag item or target has no size to measure");
        // measure() sees the item where the steps before left it: add what earlier drags carried it.
        const was = moved.get(item) ?? { x: 0, y: 0 };
        const grab = { x: from.x + was.x, y: from.y + was.y };
        if (grab.x !== pos.x || grab.y !== pos.y) glide(tl, [el], () => grab, 0.8);
        const by = { x: was.x + p.x - grab.x, y: was.y + p.y - grab.y };
        moved.set(item, by);
        // Press, carry the item with the tip on its centre, let go.
        tl.to(el, { scale: 0.85, duration: 0.1 });
        glide(tl, [el, item], (e) => (e === el ? p : by), o.duration ?? 1);
        tl.to(el, { scale: 1, duration: 0.1 });
        pos = p;
      };
    },
    click(tl) {
      // A ring that grows out of the tip and fades, while the pointer presses in and back.
      const ring = ctx.html.appendChild(document.createElement("div"));
      Object.assign(ring.style, {
        position: "absolute", left: `${pos.x - 30}px`, top: `${pos.y - 30}px`, width: "60px", height: "60px", boxSizing: "border-box",
        borderRadius: "50%", border: "5px solid var(--k-accent)", zIndex: "6", pointerEvents: "none",
      });
      gsap.set(ring, { scale: 0.2, autoAlpha: 0 });
      const at = tl.duration();
      tl.to(el, { scale: 0.85, duration: 0.08, repeat: 1, yoyo: true, ease: "power1.inOut" }, at);
      tl.set(ring, { autoAlpha: 1 }, at);
      tl.to(ring, { scale: 1.6, autoAlpha: 0, duration: 0.5, ease: "power2.out" }, at);
    },
    type(field, text) {
      return (tl) => {
        const r = field instanceof Element ? measure(ctx, field) : field;
        if (!r) return ctx.problem("pointer: type field has no size to measure");
        // The field, focused: its own --k-surface patch with an accent border, so the text reads on any picture.
        const size = Math.max(FLOOR, Math.round(r.h * 0.5));
        const box = ctx.html.appendChild(document.createElement("div"));
        box.dataset.kText = "";
        Object.assign(box.style, {
          position: "absolute", left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, boxSizing: "border-box",
          padding: `0 ${Math.round(r.h * 0.3)}px`, border: "3px solid var(--k-accent)", borderRadius: "8px", background: "var(--k-surface)",
          color: "var(--k-fg)", font: `500 ${size}px/${r.h - 6}px var(--k-font)`, whiteSpace: "pre", overflow: "hidden", zIndex: "5",
        });
        if (size > r.h - 6) ctx.problem(`pointer: field ${Math.round(r.h)} px high is too low for ${FLOOR} px text`);
        box.textContent = "";
        gsap.set(box, { autoAlpha: 0 });
        const at = tl.duration();
        if (focused) tl.set(focused, { borderColor: "var(--k-line)" }, at);
        focused = box;
        tl.to(box, { autoAlpha: 1, duration: 0.15 }, at);
        // The text as a pure function of the tween's progress, so play equals seek; the caret shows while it types.
        tl.to({}, {
          duration: Math.max(0.4, text.length / CPS),
          ease: "none",
          onUpdate(this: gsap.core.Tween) {
            const p = this.progress();
            box.textContent = typed(text, p) + (p > 0 && p < 1 ? CARET : "");
          },
        }, at + 0.15);
      };
    },
  };
}
