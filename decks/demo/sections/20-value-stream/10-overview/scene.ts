import type { SceneModule } from "../../../../../src/types";

const DRAW = 2.4; // seconds for the stream to draw from Requirements to Verification

// No build(): the default renderer gives the title. Both steps are drawn, so the step text stays hidden.
const scene: SceneModule = {
  steps: [
    (tl, _refs, ctx) => {
      const { line, boxes } = ctx.canvas.refs.stream;
      const length = Number(line.getAttribute("stroke-dasharray"));
      tl.fromTo(line, { strokeDashoffset: length }, { strokeDashoffset: 0, duration: DRAW, ease: "none" });
      // Each stage fades in as the line reaches it, left to right.
      tl.fromTo(boxes, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, stagger: DRAW / (boxes.length - 1) }, "<");
    },
    (tl, _refs, ctx) => {
      const all = Object.values(ctx.canvas.rects);
      const wholeCanvas = {
        x: 0,
        y: 0,
        w: Math.max(...all.map((r) => r.x + r.w)),
        h: Math.max(...all.map((r) => r.y + r.h)),
      };
      ctx.camera.to(tl, wholeCanvas);
    },
  ],
};
export default scene;
