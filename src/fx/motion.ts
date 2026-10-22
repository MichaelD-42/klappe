import { gsap } from "gsap";
import { motion } from "../theme";
import type { Ctx, StepAdder } from "../types";

export interface MorphOpts {
  from: Element;
  to: Element;
}
export interface BubbleOpts {
  x: number;
  y: number;
  text: string;
  side?: "left" | "right" | "top" | "bottom"; // default right
  maxWidth?: number; // px, default 640; the text wraps
}
export interface CounterOpts {
  x: number;
  y: number;
  from: number;
  to: number;
  label: string;
}

const TAIL = 24; // bubble tail size in scene units
const LINE = 3; // bubble stroke width

// The counter's text at progress p: round(lerp(from, to, p)) with the deck language's thousands separators.
export function counterText(from: number, to: number, p: number, lang = "en"): string {
  return new Intl.NumberFormat(lang).format(Math.round(from + (to - from) * p));
}

type Pose = { x: number; y: number; scaleX: number; scaleY: number };
const pose = (e: Element): Pose => {
  const get = gsap.getProperty(e);
  return { x: Number(get("x")), y: Number(get("y")), scaleX: Number(get("scaleX")), scaleY: Number(get("scaleY")) };
};

// Moves `from` onto `to` and crossfades them.
// Both scale uniformly, so text keeps its aspect. Transforms the author set (an SVG translate,
// a GSAP x) stay: the move is added on top. `to` is hidden until play. Chains work (doc -> fact -> card).
export function morph(ctx: Ctx, opts: MorphOpts): { play: StepAdder } {
  const { from, to } = opts;
  const [p, q] = [pose(from), pose(to)];
  // Re-set the current pose: a seek writes it in GSAP's form anyway, so play must start from the same attributes.
  gsap.set(from, { ...p, transformOrigin: "50% 50%" });
  gsap.set(to, { ...q, transformOrigin: "50% 50%", autoAlpha: 0 });
  return {
    play(tl) {
      // Screen boxes divided by the world's on-screen scale give world units, for HTML and SVG alike.
      // Measured while the timeline is built; immediateRender: false keeps earlier morphs from moving anything yet.
      const world = from.closest<HTMLElement>(".k-world");
      const k = world ? world.getBoundingClientRect().width / world.offsetWidth || 1 : 1;
      const [a, b] = [from.getBoundingClientRect(), to.getBoundingClientRect()];
      const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) / k;
      const dy = (b.top + b.height / 2 - (a.top + a.height / 2)) / k;
      // One factor for both axes (the geometric mean of the size ratios): no stretched text mid-way.
      const s = a.width && a.height && b.width && b.height ? Math.sqrt((b.width / a.width) * (b.height / a.height)) : 1;
      const d = motion.step * 2;
      const move = { duration: d, ease: "power2.inOut", immediateRender: false };
      // The crossfade runs over the middle 70% of the move: each shape shows alone at its end, half and half mid-way.
      const fade = { duration: d * 0.7, ease: "none", immediateRender: false };
      tl.fromTo(from, p, { x: p.x + dx, y: p.y + dy, scaleX: p.scaleX * s, scaleY: p.scaleY * s, ...move });
      tl.fromTo(to, { x: q.x - dx, y: q.y - dy, scaleX: q.scaleX / s, scaleY: q.scaleY / s }, { ...q, ...move }, "<");
      tl.fromTo(from, { autoAlpha: 1 }, { autoAlpha: 0, ...fade }, `<${d * 0.15}`);
      tl.fromTo(to, { autoAlpha: 0 }, { autoAlpha: 1, ...fade }, "<");
    },
  };
}

type Side = "left" | "right" | "top" | "bottom";
// Where the bubble sits from its point (dx, dy, anchor percents) and which edge carries the tail.
// left/right name where the bubble sits (as before); top/bottom name the tail's edge, so "top" sits below the point.
export function bubbleLayout(side: Side) {
  return {
    right: { dx: TAIL, dy: 0, xPercent: 0, yPercent: -50, origin: "0% 50%", edge: "left", stroke: ["Left", "Bottom"] },
    left: { dx: -TAIL, dy: 0, xPercent: -100, yPercent: -50, origin: "100% 50%", edge: "right", stroke: ["Top", "Right"] },
    top: { dx: 0, dy: TAIL, xPercent: -50, yPercent: 0, origin: "50% 0%", edge: "top", stroke: ["Top", "Left"] },
    bottom: { dx: 0, dy: -TAIL, xPercent: -50, yPercent: -100, origin: "50% 100%", edge: "bottom", stroke: ["Bottom", "Right"] },
  }[side];
}

// A speech bubble whose tail points at (x, y), scene-local. side: see bubbleLayout. maxWidth: px, the text wraps.
// show and hide take an optional position, for example "<" to show or hide together with another bubble.
export function bubble(
  ctx: Ctx,
  opts: BubbleOpts,
): { show: (tl: gsap.core.Timeline, at?: gsap.Position) => void; hide: (tl: gsap.core.Timeline, at?: gsap.Position) => void } {
  const { x, y, text } = opts;
  const L = bubbleLayout(opts.side ?? "right");
  const box = document.createElement("div");
  box.textContent = text;
  Object.assign(box.style, {
    position: "absolute",
    left: `${x + L.dx}px`,
    top: `${y + L.dy}px`,
    width: "max-content",
    maxWidth: `${opts.maxWidth ?? 640}px`,
    boxSizing: "border-box",
    padding: "20px 32px",
    borderRadius: "6px",
    // An outline, like the line art: accent stroke on the background colour.
    border: `${LINE}px solid var(--k-accent)`,
    background: "var(--k-bg)",
    color: "var(--k-fg)",
    fontSize: "36px",
    fontWeight: "600",
    lineHeight: "1.3",
  });
  // The tail: a diamond with the stroke on its two outer sides; its inner half covers the box's stroke.
  const tail = document.createElement("div");
  const stroke = `${LINE}px solid var(--k-accent)`;
  const across = L.edge === "left" || L.edge === "right" ? "top" : "left";
  Object.assign(tail.style, {
    position: "absolute",
    [across]: `calc(50% - ${TAIL / 2}px)`,
    [L.edge]: `${-TAIL / 2 - LINE / 2}px`,
    width: `${TAIL}px`,
    height: `${TAIL}px`,
    boxSizing: "border-box",
    background: "var(--k-bg)",
    [`border${L.stroke[0]}`]: stroke,
    [`border${L.stroke[1]}`]: stroke,
    rotate: "45deg",
  });
  box.append(tail);
  ctx.html.append(box);
  gsap.set(box, { xPercent: L.xPercent, yPercent: L.yPercent, autoAlpha: 0, transformOrigin: L.origin });
  return {
    show(tl, at) {
      tl.fromTo(box, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: motion.step, ease: "back.out(2)", immediateRender: false }, at);
    },
    hide(tl, at) {
      tl.to(box, { autoAlpha: 0, duration: motion.step }, at);
    },
  };
}

// A big number with a label under it, centred on (x, y), scene-local. run counts from -> to.
export function counter(ctx: Ctx, opts: CounterOpts): { run: StepAdder; el: HTMLElement; caption: HTMLElement } {
  const { x, y, from, to, label } = opts;
  const box = document.createElement("div");
  Object.assign(box.style, { position: "absolute", left: `${x}px`, top: `${y}px`, textAlign: "center", width: "max-content" });
  const num = document.createElement("div");
  num.dataset.kText = "";
  num.textContent = counterText(from, to, 0, ctx.deck.lang);
  Object.assign(num.style, { fontSize: "144px", fontWeight: "700", lineHeight: "1", color: "var(--k-accent)", fontVariantNumeric: "tabular-nums" });
  const cap = document.createElement("div");
  cap.textContent = label;
  Object.assign(cap.style, { fontSize: "36px", marginTop: "12px" });
  box.append(num, cap);
  ctx.html.append(box);
  gsap.set(box, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
  return {
    el: box,
    caption: cap,
    run(tl) {
      tl.to(box, { autoAlpha: 1, duration: motion.step });
      tl.to({}, {
        duration: motion.step * 3,
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          num.textContent = counterText(from, to, this.progress(), ctx.deck.lang);
        },
      });
    },
  };
}
