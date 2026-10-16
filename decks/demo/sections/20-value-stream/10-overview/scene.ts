import type { SceneModule } from "klappe/types";

const DRAW = 2.4; // seconds for the stream to draw from Requirements to Verification
const PAD = 120; // stage px of air right of the stream when the camera pulls back

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
      // From this scene's left edge, so the title stays in frame, to just past the last stage.
      const b = ctx.canvas.refs.stream.bounds;
      const x = Math.min(ctx.rect.x, b.x - PAD);
      ctx.camera.to(tl, { x, y: b.y, w: b.x + b.w + PAD - x, h: b.h });
    },
  ],
};
export default scene;
