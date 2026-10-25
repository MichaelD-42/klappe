import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { Ctx, StepAdder } from "../types";

gsap.registerPlugin(MotionPathPlugin);

export interface TravelOpts {
  path: string | SVGPathElement; // an SVG "d" in scene units, or a path in ctx.svg whose "d" is read
  duration?: number; // seconds; default 2
  route?: "show" | "draw"; // a string path only: the line shows from the start, or draws on behind the element
  rotate?: boolean; // turn the element to face along the path; default false
}

const EASE = "power1.inOut";

// travel's step adder, with its move as a pure function for follow: where the element is at time share t (0..1)
// of the move, in scene units, and the move's start on the timeline (set when the step is added).
export type TravelHandle = StepAdder & { point?(t: number): { x: number; y: number }; duration?: number; start?: number; route?: SVGPathElement };

// One step: el moves along the path, start to end. Like flow's packets, el must sit at the scene origin
// (left 0, top 0) with its visual centred there: the path moves that point. It waits at the path's start until its step.
export function travel(ctx: Ctx, el: Element, opts: TravelOpts): TravelHandle {
  const { path, duration = 2, route, rotate = false } = opts;
  const d = typeof path === "string" ? path : (path.getAttribute("d") ?? "");
  const raw = MotionPathPlugin.getRawPath(d);
  MotionPathPlugin.cacheRawPathMeasurements(raw);
  if (!((raw as { totalLength?: number }).totalLength! > 0)) {
    ctx.problem("travel: path has no length");
    return (tl) => void tl.set({}, {}, tl.duration() + 0.1);
  }
  const at = (p: number) => {
    const q = MotionPathPlugin.getPositionOnPath(raw, p, true) as { x: number; y: number; angle: number };
    return { x: q.x, y: q.y, ...(rotate ? { rotation: q.angle } : {}) };
  };
  // At the start, where a rewound motionPath tween leaves it: play and seek then agree.
  gsap.set(el, { ...at(0), ...(rotate ? { transformOrigin: "50% 50%" } : {}) });

  let line: SVGPathElement | undefined;
  if (route && typeof path === "string") {
    line = ctx.svg.appendChild(document.createElementNS("http://www.w3.org/2000/svg", "path"));
    line.setAttribute("d", d);
    line.setAttribute("data-k-route", "");
    // No round caps: one would peek out at the start of the hidden dash.
    Object.assign(line.style, { fill: "none", stroke: "var(--k-line)", strokeWidth: "4", strokeLinejoin: "round" });
    // Placed before el in the DOM when both are in ctx.svg, so the route paints under it.
    if (el.parentNode === ctx.svg) ctx.svg.insertBefore(line, el);
    // pathLength 1: dash 1, gap 2, offset 1 hides it; offset 0 shows it whole.
    if (route === "draw") gsap.set(line, { attr: { pathLength: 1 }, strokeDasharray: "1 2", strokeDashoffset: 1, autoRound: false });
  }

  const ease = gsap.parseEase(EASE);
  const handle: TravelHandle = (tl) => {
    const t = tl.duration();
    handle.start = t;
    if (ctx.reducedMotion) {
      tl.set(el, at(1), t);
      if (line && route === "draw") tl.set(line, { strokeDashoffset: 0 }, t);
      return;
    }
    tl.to(el, { motionPath: { path: d, autoRotate: rotate }, duration, ease: EASE }, t);
    // The same ease as el, so the line's end stays under it.
    if (line && route === "draw")
      tl.fromTo(line, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration, ease: EASE, autoRound: false, immediateRender: false }, t);
  };
  return Object.assign(handle, { point: (s: number) => at(ease(s)), duration, route: line });
}
