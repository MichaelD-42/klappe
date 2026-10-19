import { drawOn } from "klappe/fx";
import type { SceneModule } from "klappe/types";

const SEG = 1.1; // seconds for the stream to draw from one stage to the next, with the camera on it
const HOLD = 0.6; // seconds the camera rests on a stage while it draws
const TOUR = { w: 1440, h: 810 }; // the camera's frame on the stream band during the draw
const PAD = 120; // stage px of air right of the stream when the camera pulls back

// No build(): the default renderer gives the title. Both steps are drawn, so the step text stays hidden.
const scene: SceneModule = {
  steps: [
    (tl, _refs, ctx) => {
      const { line, boxes, tiles, bounds: b } = ctx.canvas.refs.stream;
      const length = Number(line.getAttribute("stroke-dasharray"));
      const title = ctx.html.querySelector("h2");
      const stage = (i: number, at: number) => {
        tl.fromTo(boxes[i], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, at);
        drawOn(boxes[i].querySelector("rect"), { at, duration: 0.7 })(tl);
        tiles[i].draw(tl, at);
      };
      // Stage by stage: the camera rides along the band while the line draws to the next stage.
      // The frame stops at the stream's end, so it never shows the next section's slot.
      const right = b.x + b.w + PAD - TOUR.w;
      let t = tl.duration();
      stage(0, t);
      t += 1.2;
      tl.to(title, { autoAlpha: 0, duration: 0.4 }, t); // it would leave the frame with the camera
      for (let i = 1; i < boxes.length; i++) {
        const box = boxes[i].querySelector("rect");
        const x = Math.min(Number(box.getAttribute("x")) + Number(box.getAttribute("width")) / 2 - TOUR.w / 2, right);
        // Centred on the band from the tile tops to the box bottoms.
        ctx.camera.to(tl, { x, y: b.y + b.h - 104 - TOUR.h / 2, ...TOUR }, { duration: SEG, at: t });
        tl.to(line, { strokeDashoffset: length * (1 - i / (boxes.length - 1)), duration: SEG, ease: "power2.inOut" }, t);
        t += SEG - 0.2;
        stage(i, t);
        t += 0.2 + HOLD;
      }
    },
    (tl, _refs, ctx) => {
      // From this scene's left edge, so the title stays in frame, to just past the last stage.
      const b = ctx.canvas.refs.stream.bounds;
      const x = Math.min(ctx.rect.x, b.x - PAD);
      ctx.camera.to(tl, { x, y: b.y, w: b.x + b.w + PAD - x, h: b.h });
      tl.to(ctx.html.querySelector("h2"), { autoAlpha: 1, duration: 0.6 }, "<");
    },
  ],
};
export default scene;
