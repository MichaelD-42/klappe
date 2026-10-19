import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { Ctx, StepAdder } from "../types";

gsap.registerPlugin(MotionPathPlugin);

export interface FigureOpts {
  x: number;
  y: number;
  scale?: number; // default 1
  color: string;
}
export interface FigureHandle {
  appear: StepAdder;
  walk(tl: gsap.core.Timeline, path: SVGPathElement | string, opts: { duration: number }): void;
  gather(tl: gsap.core.Timeline, x: number, y: number): void;
}

// The limb angle in degrees during a walk: one full stride per step, straight at progress 0 and 1.
export const limbAngle = (progress: number, steps: number, swing = 25) =>
  swing * Math.sin(progress * steps * 2 * Math.PI);

const SVG = "http://www.w3.org/2000/svg";
const STRIDES_PER_SECOND = 1.6;
const GATHER_SECONDS = 1.2;

function shape(parent: SVGGElement, tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
}

// A standing figure about 230 units tall, feet at (x, y). Coordinates are scene-local.
// Paths for walk() are in the same space; the feet follow the path.
export function figure(ctx: Ctx, opts: FigureOpts): FigureHandle {
  const root = shape(ctx.svg, "g", { "data-k-figure": "" }) as SVGGElement;
  Object.assign(root.style, { stroke: opts.color, fill: "none", strokeWidth: "4", strokeLinecap: "round", strokeLinejoin: "round" });

  // Limbs are groups pivoting at the shoulder or hip; the swing rewrites their transform attribute.
  const limb = (px: number, py: number, d: string) => {
    const g = shape(root, "g", {}) as SVGGElement;
    shape(g, "path", { d });
    return (a: number) => g.setAttribute("transform", `translate(${px} ${py}) rotate(${a.toFixed(2)})`);
  };
  const legs = [limb(-9, -98, "M0 0 L0 98"), limb(9, -98, "M0 0 L0 98")];
  const arms = [limb(-21, -150, "M0 0 L-7 34 L-9 66"), limb(21, -150, "M0 0 L7 34 L9 66")];
  shape(root, "path", { d: "M-20 -98 L-23 -146 Q-23 -160 0 -160 Q23 -160 23 -146 L20 -98 Z" }); // torso
  shape(root, "path", { d: "M0 -160 L0 -170" }); // neck
  shape(root, "circle", { cx: 0, cy: -196, r: 26 }); // head
  shape(root, "path", { d: "M-27 -200 Q-27 -230 0 -230 Q27 -230 27 -200" }); // hair
  shape(root, "path", { d: "M-9 -201 L-9 -195 M9 -201 L9 -195 M-8 -184 Q0 -178 8 -184" }); // face

  const swing = (a: number) => {
    legs[0](a);
    legs[1](-a);
    arms[0](-0.8 * a);
    arms[1](0.8 * a);
  };
  swing(0);
  // svgOrigin pins scale to the feet; GSAP otherwise scales SVG around the bbox corner.
  gsap.set(root, { svgOrigin: "0 0", x: opts.x, y: opts.y, scale: opts.scale ?? 1, autoAlpha: 0 });

  // Swing is written from the tween's own progress, so a seek lands on the same pose as play.
  const stride = (steps: number) =>
    function (this: gsap.core.Tween) {
      swing(limbAngle(this.progress(), steps));
    };

  return {
    appear: (tl) => void tl.to(root, { autoAlpha: 1, duration: 0.5 }),
    walk(tl, path, { duration }) {
      const steps = Math.max(1, Math.round(duration * STRIDES_PER_SECOND));
      tl.to(root, { motionPath: { path }, duration, ease: "none", onUpdate: stride(steps) });
    },
    gather(tl, x, y) {
      const steps = Math.round(GATHER_SECONDS * STRIDES_PER_SECOND);
      tl.to(root, { x, y, duration: GATHER_SECONDS, ease: "none", onUpdate: stride(steps) });
    },
  };
}
