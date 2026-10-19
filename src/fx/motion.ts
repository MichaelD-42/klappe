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
  side: "left" | "right";
}
export interface CounterOpts {
  x: number;
  y: number;
  from: number;
  to: number;
  label: string;
}

const TAIL = 24; // bubble tail size in scene units

// The counter's text at progress p: round(lerp(from, to, p)).
export function counterText(from: number, to: number, p: number): string {
  return String(Math.round(from + (to - from) * p));
}

// Moves `from` onto `to` while it fades out, and `to` grows out of `from` while it fades in.
// `to` is hidden until play. Chains work (doc -> fact -> card): each play measures untransformed layout.
export function morph(ctx: Ctx, opts: MorphOpts): { play: StepAdder } {
  const { from, to } = opts;
  // Identity transforms at load: a seek renders them anyway, so play must start from the same attributes.
  gsap.set([from, to], { x: 0, y: 0, scaleX: 1, scaleY: 1 });
  gsap.set(to, { autoAlpha: 0 });
  return {
    play(tl) {
      // Screen boxes divided by the world's on-screen scale give world units, for HTML and SVG alike.
      // Measured while the timeline is built; immediateRender: false keeps earlier morphs from moving anything yet.
      const world = from.closest<HTMLElement>(".k-world");
      const k = world ? world.getBoundingClientRect().width / world.offsetWidth || 1 : 1;
      const [a, b] = [from.getBoundingClientRect(), to.getBoundingClientRect()];
      const dx = (b.left + b.width / 2 - (a.left + a.width / 2)) / k;
      const dy = (b.top + b.height / 2 - (a.top + a.height / 2)) / k;
      const sx = a.width && b.width ? b.width / a.width : 1;
      const sy = a.height && b.height ? b.height / a.height : 1;
      const common = { duration: motion.step * 2, ease: "power2.inOut", transformOrigin: "50% 50%", immediateRender: false };
      tl.fromTo(from, { x: 0, y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1 }, { x: dx, y: dy, scaleX: sx, scaleY: sy, autoAlpha: 0, ...common });
      tl.fromTo(to, { x: -dx, y: -dy, scaleX: 1 / sx, scaleY: 1 / sy, autoAlpha: 0 }, { x: 0, y: 0, scaleX: 1, scaleY: 1, autoAlpha: 1, ...common }, "<");
    },
  };
}

// A speech bubble whose tail points at (x, y), scene-local. side: where the bubble sits from that point.
export function bubble(ctx: Ctx, opts: BubbleOpts): { show: StepAdder; hide: StepAdder } {
  const { x, y, text, side } = opts;
  const right = side === "right";
  const box = document.createElement("div");
  box.textContent = text;
  Object.assign(box.style, {
    position: "absolute",
    left: `${x + (right ? TAIL : -TAIL)}px`,
    top: `${y}px`,
    width: "max-content",
    maxWidth: "640px",
    boxSizing: "border-box",
    padding: "20px 32px",
    borderRadius: "16px",
    background: "var(--k-accent)",
    color: "var(--k-bg)",
    fontSize: "36px",
    fontWeight: "600",
    lineHeight: "1.3",
  });
  const tail = document.createElement("div");
  Object.assign(tail.style, {
    position: "absolute",
    top: `calc(50% - ${TAIL / 2}px)`,
    [right ? "left" : "right"]: `${-TAIL / 2}px`,
    width: `${TAIL}px`,
    height: `${TAIL}px`,
    background: "var(--k-accent)",
    rotate: "45deg",
  });
  box.append(tail);
  ctx.html.append(box);
  gsap.set(box, { xPercent: right ? 0 : -100, yPercent: -50, autoAlpha: 0, transformOrigin: right ? "0% 50%" : "100% 50%" });
  return {
    show(tl) {
      tl.fromTo(box, { autoAlpha: 0, scale: 0.85 }, { autoAlpha: 1, scale: 1, duration: motion.step, ease: "back.out(2)", immediateRender: false });
    },
    hide(tl) {
      tl.to(box, { autoAlpha: 0, duration: motion.step });
    },
  };
}

// A big number with a label under it, centred on (x, y), scene-local. run counts from -> to.
export function counter(ctx: Ctx, opts: CounterOpts): { run: StepAdder } {
  const { x, y, from, to, label } = opts;
  const box = document.createElement("div");
  Object.assign(box.style, { position: "absolute", left: `${x}px`, top: `${y}px`, textAlign: "center", width: "max-content" });
  const num = document.createElement("div");
  num.dataset.kText = "";
  num.textContent = counterText(from, to, 0);
  Object.assign(num.style, { fontSize: "144px", fontWeight: "700", lineHeight: "1", color: "var(--k-accent)", fontVariantNumeric: "tabular-nums" });
  const cap = document.createElement("div");
  cap.textContent = label;
  Object.assign(cap.style, { fontSize: "36px", marginTop: "12px" });
  box.append(num, cap);
  ctx.html.append(box);
  gsap.set(box, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
  return {
    run(tl) {
      tl.to(box, { autoAlpha: 1, duration: motion.step });
      tl.to({}, {
        duration: motion.step * 3,
        ease: "none",
        onUpdate(this: gsap.core.Tween) {
          num.textContent = counterText(from, to, this.progress());
        },
      });
    },
  };
}
