import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { Ctx, StepAdder } from "../types";

gsap.registerPlugin(MotionPathPlugin);

export interface FigureOpts {
  x: number;
  y: number;
  scale?: number; // default 1
  color: string;
  strokeWidth?: number; // in figure units, before scale; default 4
  seated?: boolean; // seated from load; default standing
}
export interface FigureHandle {
  el: SVGGElement; // the figure's root group, for a scene that dims or moves it
  // `at` is the position on the timeline, as in tl.to.
  appear(tl: gsap.core.Timeline, at?: gsap.Position): void;
  /**
   * Walks the feet along the path. The path's coordinates must be in the same space as the
   * figure's parent (ctx.svg, scene-local); a path under a transformed ancestor lands elsewhere.
   * `at` is the position on the timeline, as in tl.to.
   */
  walk(
    tl: gsap.core.Timeline,
    path: SVGPathElement | string,
    opts: { duration: number; at?: gsap.Position },
  ): void;
  // Walks to (x, y). `at` is the position on the timeline; duration defaults to 1.2 s.
  gather(tl: gsap.core.Timeline, x: number, y: number, at?: gsap.Position, duration?: number): void;
  // Sits down where it stands, or stands up again; walk only from standing. `at` as in tl.to.
  sit(tl: gsap.core.Timeline, at?: gsap.Position): void;
  stand(tl: gsap.core.Timeline, at?: gsap.Position): void;
}

// The limb angle in degrees during a walk: one full stride per step, straight at progress 0 and 1.
export const limbAngle = (progress: number, steps: number, swing = 25) =>
  swing * Math.sin(progress * steps * 2 * Math.PI);

const SVG = "http://www.w3.org/2000/svg";
const STRIDES_PER_SECOND = 1.6;
const GATHER_SECONDS = 1.2;
const KNEE = 48; // the lifted thigh's angle at the top of a stride, in degrees
const ARM = 12; // the arm's outward swing at the top of a stride, in degrees
const HIP_Y = -100; // thigh 50 + shin 50: a straight leg puts its foot on y = 0
const DROP = 45; // how far the hips come down to sit: the thighs, seen from the front, shorten by as much
const KNEES = 8; // how far each knee moves out when seated
const SIT_SECONDS = 0.6;

function shape(parent: SVGGElement, tag: string, attrs: Record<string, string | number>): SVGElement {
  const e = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  parent.append(e);
  return e;
}

// Two decimals and never "-0", so play and seek write the same text.
const deg = (a: number) => Math.round(a * 100) / 100 || 0;

// A front-facing figure about 230 units tall, feet at (x, y). Coordinates are scene-local.
export function figure(ctx: Ctx, opts: FigureOpts): FigureHandle {
  const root = shape(ctx.svg, "g", { "data-k-figure": "" }) as SVGGElement;
  Object.assign(root.style, { stroke: opts.color, fill: "none", strokeWidth: String(opts.strokeWidth ?? 4), strokeLinecap: "round", strokeLinejoin: "round" });

  // A joint is a group at a pivot; the pose rewrites its transform attribute, so it is in the snapshot.
  const joint = (parent: SVGGElement, px: number, py: number, d: string) => {
    const g = shape(parent, "g", {}) as SVGGElement;
    shape(g, "path", { d });
    const turn = (a: number) => g.setAttribute("transform", `translate(${px} ${py}) rotate(${deg(a)})`);
    return { g, turn };
  };
  // side -1 is the figure's right (screen left). Each leg stays on its side of the hips.
  // seat (0 standing, 1 seated): the hip comes down by DROP and the thigh, pointing at the viewer, shortens to
  // its foreshortened length with the knee a little out; the shin stays upright, so the foot stays on y = 0.
  const leg = (side: number) => {
    const thigh = joint(root, 12 * side, HIP_Y, "M0 0 L0 50");
    const thighPath = thigh.g.firstElementChild!;
    const shin = joint(thigh.g, 0, 50, `M0 0 L0 50 M${-side} 50 L${9 * side} 50`); // shin and foot
    // The thigh swings out, the shin back by twice as much: the knee bends and the foot lifts.
    return (lift: number, seat: number) => {
      const knee = [deg(KNEES * side * seat), deg(50 - DROP * seat)];
      thigh.g.setAttribute("transform", `translate(${12 * side} ${deg(HIP_Y + DROP * seat)}) rotate(${deg(-side * KNEE * lift)})`);
      thighPath.setAttribute("d", `M0 0 L${knee[0]} ${knee[1]}`);
      shin.g.setAttribute("transform", `translate(${knee[0]} ${knee[1]}) rotate(${deg(2 * side * KNEE * lift)})`);
    };
  };
  let upper: SVGGElement; // everything above the hips, so a seated pose lowers it in one move; made after the legs
  const arm = (side: number) => {
    const a = joint(upper, 28 * side, -150, `M0 0 L${6 * side} 36 L${8 * side} 64 M${-6 * side} -10 Q${14 * side} -10 ${15 * side} 22 L${4 * side} 25`);
    shape(a.g, "circle", { cx: 8 * side, cy: 70, r: 5 }); // hand
    return (out: number) => a.turn(-side * ARM * out);
  };
  // A chair under the seated figure, behind the legs; it shows as the figure sits.
  const chair = shape(root, "path", { d: `M-34 ${HIP_Y + DROP} L34 ${HIP_Y + DROP} M-30 ${HIP_Y + DROP} L-30 0 M30 ${HIP_Y + DROP} L30 0` });
  const legs = [leg(-1), leg(1)];
  upper = shape(root, "g", {}) as SVGGElement; // after the legs: the torso paints over the hips
  const arms = [arm(-1), arm(1)];
  shape(upper, "path", { d: "M-11 -164 Q-30 -160 -31 -140 L-25 -100 L25 -100 L31 -140 Q30 -160 11 -164" }); // shoulders, torso, belt
  shape(upper, "path", { d: "M-11 -164 L0 -151 L11 -164" }); // collar
  shape(upper, "path", { d: "M-6 -171 L-6 -165 M6 -171 L6 -165" }); // neck
  shape(upper, "circle", { cx: 0, cy: -197, r: 26 }); // head
  shape(upper, "path", { d: "M-26 -203 Q-32 -197 -26 -190 M26 -203 Q32 -197 26 -190" }); // ears
  shape(upper, "path", { d: "M-27 -201 Q-27 -231 0 -231 Q27 -231 27 -201" }); // hair
  shape(upper, "path", { d: "M-9 -202 L-9 -196 M9 -202 L9 -196 M-8 -185 Q0 -179 8 -185" }); // face

  // s in [-1, 1]: s > 0 lifts the screen-left leg and swings the opposite arm out, s < 0 the other pair.
  // The planted leg is straight, so the lowest foot stays on the path.
  let seat = opts.seated ? 1 : 0; // the seat a stride writes with: the pose after the steps added so far
  const pose = (s: number, at: number) => {
    const l = Math.max(0, s);
    const r = Math.max(0, -s);
    legs[0](l, at);
    legs[1](r, at);
    arms[1](l);
    arms[0](r);
    upper.setAttribute("transform", `translate(0 ${deg(DROP * at)})`);
    chair.setAttribute("opacity", String(deg(at)));
  };
  pose(0, seat);
  // svgOrigin pins scale to the feet; GSAP otherwise scales SVG around the bbox corner.
  gsap.set(root, { svgOrigin: "0 0", x: opts.x, y: opts.y, scale: opts.scale ?? 1, autoAlpha: 0 });

  // The pose is written from the tween's own progress, so a seek lands on the same pose as play.
  const stride = (duration: number) => {
    const steps = Math.max(1, Math.round(duration * STRIDES_PER_SECOND));
    const at = seat; // as the step is added, not as it plays
    return function (this: gsap.core.Tween) {
      pose(limbAngle(this.progress(), steps, 1), at);
    };
  };

  // From the seat the steps before left to `to`, written from the tween's progress.
  const settle = (tl: gsap.core.Timeline, to: number, at?: gsap.Position) => {
    const from = seat;
    seat = to;
    tl.to({}, { duration: SIT_SECONDS, ease: "none", onUpdate(this: gsap.core.Tween) {
      pose(0, from + (to - from) * gsap.parseEase("power2.inOut")(this.progress()));
    } }, at);
  };

  return {
    el: root,
    appear: (tl, at) => void tl.to(root, { autoAlpha: 1, duration: 0.5 }, at),
    walk(tl, path, { duration, at }) {
      tl.to(root, { motionPath: { path }, duration, ease: "none", onUpdate: stride(duration) }, at);
    },
    gather(tl, x, y, at, duration = GATHER_SECONDS) {
      tl.to(root, { x, y, duration, ease: "none", onUpdate: stride(duration) }, at);
    },
    sit: (tl, at) => settle(tl, 1, at),
    stand: (tl, at) => settle(tl, 0, at),
  };
}
