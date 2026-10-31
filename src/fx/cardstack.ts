import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";
import { typeSize } from "./draw";
import { radius } from "./layout";

export interface CardStackOpts {
  x: number; // top-left corner of the middle card before it leans, scene-local
  y: number;
  w?: number; // default 360
  h?: number; // default 480
  cards: string[];
}
export interface CardStackHandle {
  show: StepAdder;
  pull(i: number): StepAdder; // lifts card i out of the fan and enlarges it; the rest dim
  back: StepAdder; // puts the pulled card back; the rest light up again
}

const SPREAD = 32; // the angle between the outer cards, degrees
const STEP = 8; // the most between two neighbours, degrees
const ORIGIN = "50% 140%"; // the cards turn about a point below the stack, like a hand of cards
const DIM = 0.45; // the scrim over a card left behind, --k-bg at this opacity
const LIFT = 0.15; // the pulled card rises by this share of its height
const GROW = 1.2;
const FONT = 32;
const FLOOR = 20; // legibility floor, scene px (14.2 px at 1366)

// Card i's lean in a fan of n, degrees: symmetric about the middle card.
export const fanPose = (i: number, n: number) => (n > 1 ? (i - (n - 1) / 2) * Math.min(STEP, SPREAD / (n - 1)) : 0);

// A fanned stack of cards; one is pulled out and enlarged while the rest stay behind, dimmed.
// With reduced motion the cards cut to their place instead of moving; the dim still fades.
export function cardStack(ctx: Ctx, opts: CardStackOpts): CardStackHandle {
  const [w, h, n] = [opts.w ?? 360, opts.h ?? 480, opts.cards.length];
  const move = !ctx.reducedMotion;
  const root = ctx.html.appendChild(document.createElement("div"));
  root.setAttribute("data-k-cardstack", "");
  Object.assign(root.style, { position: "absolute", left: `${opts.x}px`, top: `${opts.y}px`, width: `${w}px`, height: `${h}px` });
  gsap.set(root, { autoAlpha: 0 });
  // The face style of flipCard: surface, a 2 px --k-line border, 16 px corners.
  const cards = opts.cards.map((text, i) => {
    const el = root.appendChild(document.createElement("div"));
    el.setAttribute("data-k-card", String(i));
    el.appendChild(document.createElement("span")).textContent = text;
    Object.assign(el.style, {
      position: "absolute", inset: "0", boxSizing: "border-box", padding: "32px 28px", borderRadius: radius(16), background: "var(--k-surface)",
      border: "2px solid var(--k-line)", outline: "2px solid transparent", // border and outline turn accent when pulled: 4 px of accent, no layout change
      color: "var(--k-fg)", font: `600 ${typeSize("label", FONT)}px/1.25 var(--k-font)`, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center",
      transformOrigin: ORIGIN, zIndex: String(i + 1),
    });
    const scrim = el.appendChild(document.createElement("div"));
    Object.assign(scrim.style, { position: "absolute", inset: "0", borderRadius: radius(14), background: "var(--k-bg)", pointerEvents: "none" });
    gsap.set(scrim, { autoAlpha: 0 });
    gsap.set(el, { rotation: move ? 0 : fanPose(i, n), y: 0, scale: 1 }); // closed before show, unless it cannot move
    return { el, scrim };
  });
  const fan = (i: number) => ({ rotation: fanPose(i, n), y: 0, scale: 1 });
  const pose = (tl: gsap.core.Timeline, el: HTMLElement, vars: gsap.TweenVars, at: number) =>
    move ? tl.to(el, { ...vars, duration: motion.step, ease: "power2.inOut" }, at) : tl.set(el, { ...vars, immediateRender: false }, at);
  const dim = (tl: gsap.core.Timeline, except: number | undefined, at: number) =>
    cards.forEach((c, k) => tl.to(c.scrim, { autoAlpha: except === undefined || k === except ? 0 : DIM, duration: motion.step }, at));

  // Text is fitted on first use: the layout exists by then, not while building. The card's font size, so the
  // whole card scales with it; the content box is the card less its padding.
  let fitted = false;
  const fit = () => {
    if (fitted) return;
    fitted = true;
    cards.forEach(({ el }, i) => {
      const text = el.firstElementChild as HTMLElement;
      const over = () => text.offsetHeight > el.clientHeight - 64 || text.scrollWidth > el.clientWidth - 56;
      let size = typeSize("label", FONT);
      for (; size > FLOOR; size -= 2) {
        el.style.fontSize = `${size}px`;
        if (!over()) break;
      }
      el.style.fontSize = `${size}px`;
      if (over()) ctx.problem(`cardStack: text of card ${i} too long`);
    });
  };

  let pulled: number | undefined; // step-order state, written only inside the adders
  const settle = (tl: gsap.core.Timeline, i: number, at: number) => {
    tl.set(cards[i].el, { zIndex: i + 1, outlineColor: "transparent", borderColor: "var(--k-line)", immediateRender: false }, at);
    pose(tl, cards[i].el, fan(i), at);
  };

  return {
    show(tl) {
      fit();
      const t = tl.duration();
      tl.to(root, { autoAlpha: 1, duration: 0.4 }, t);
      if (move) cards.forEach((c, i) => tl.fromTo(c.el, { rotation: 0 }, { rotation: fanPose(i, n), duration: motion.step, ease: "power2.out", immediateRender: false }, t + 0.2));
    },
    pull(i) {
      if (!Number.isInteger(i) || i < 0 || i >= n) throw new Error(`cardStack: no card ${i}`);
      return (tl) => {
        fit();
        const t = tl.duration();
        const prev = pulled;
        pulled = i;
        if (prev !== undefined && prev !== i) settle(tl, prev, t);
        tl.set(cards[i].el, { zIndex: n + 1, outlineColor: "var(--k-accent)", borderColor: "var(--k-accent)", immediateRender: false }, t);
        pose(tl, cards[i].el, { rotation: 0, y: -h * LIFT, scale: GROW }, t);
        dim(tl, i, t);
      };
    },
    back(tl) {
      fit();
      const t = tl.duration();
      const prev = pulled;
      pulled = undefined;
      if (prev !== undefined) settle(tl, prev, t);
      dim(tl, undefined, t);
    },
  };
}
