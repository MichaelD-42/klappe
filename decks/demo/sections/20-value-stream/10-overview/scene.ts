import { drawOn } from "klappe/fx";
import type { Rect, SceneModule } from "klappe/types";
import { heading } from "../section";

const SEG = 1.1; // seconds for the stream to draw from one stage to the next, with the camera on it
const HOLD = 0.6; // seconds the camera rests on a stage while it draws
const TOUR = { w: 1440, h: 810 }; // the camera's frame on the stream band during the draw
const AIR = 120; // stage px around the last two stages when the tour ends
const BAND = 942; // the band's vertical centre: from the tile tops (817) to the box bottoms (1067)
// The pulled-back frame, in screen px: the stream runs from the title's left edge to a right margin.
const REST = { left: 160, right: 1760, title: 140, band: 600 };

// The whole stream in a 16:9 frame: s is the camera scale, title the top-left of the big heading.
function rest(b: Rect) {
  const s = (REST.right - REST.left) / b.w;
  const frame = { x: b.x - REST.left / s, y: BAND - REST.band / s, w: 1920 / s, h: 1080 / s };
  return { s, frame, title: { x: b.x, y: frame.y + REST.title / s } };
}

const scene: SceneModule = {
  build(ctx) {
    const title = heading(ctx, "Overview");
    // The same heading for the pulled-back view, sized so it reads like every other scene title.
    const { s, title: at } = rest(ctx.canvas.refs.stream.bounds);
    const big = heading(ctx, "Overview");
    Object.assign(big.style, {
      position: "absolute", margin: "0", width: "max-content",
      left: `${at.x - ctx.rect.x}px`, top: `${at.y - ctx.rect.y}px`, fontSize: `${88 / s}px`,
    });
    return { title, big };
  },
  steps: [
    (tl, r, ctx) => {
      const { line, boxes, tiles, bounds: b } = ctx.canvas.refs.stream;
      const length = Number(line.getAttribute("stroke-dasharray"));
      const stage = (i: number, at: number) => {
        drawOn(boxes[i].querySelector("rect"), { at, duration: 0.7 })(tl);
        tl.fromTo(boxes[i].querySelector("text"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, at + 0.3);
        tiles[i].draw(tl, at);
      };
      tl.to(r.title, { autoAlpha: 1, duration: 0.6 });
      // Stage by stage: the camera rides along the band while the line draws to the next stage.
      let t = tl.duration();
      stage(0, t);
      t += 1.2;
      tl.to(r.title, { autoAlpha: 0, duration: 0.4 }, t); // it would leave the frame with the camera
      const last = boxes.length - 1;
      const left = (i: number) => Number(boxes[i].querySelector("rect").getAttribute("x"));
      const half = (b.x + b.w - left(last)) / 2; // half a box width
      for (let i = 1; i <= last; i++) {
        // The last stop frames Design and Verification whole, and ends at the stream's end.
        const x0 = i < last ? left(i) + half - TOUR.w / 2 : left(i - 1) - AIR;
        const w = i < last ? TOUR.w : b.x + b.w + AIR - x0;
        const h = (w * 9) / 16;
        ctx.camera.to(tl, { x: x0, y: BAND - h / 2, w, h }, { duration: SEG, at: t });
        tl.to(line, { strokeDashoffset: length * (1 - i / last), duration: SEG, ease: "power2.inOut" }, t);
        t += SEG - 0.2;
        stage(i, t);
        t += 0.2 + HOLD;
      }
    },
    (tl, r, ctx) => {
      ctx.camera.to(tl, rest(ctx.canvas.refs.stream.bounds).frame);
      tl.to(r.big, { autoAlpha: 1, duration: 0.6 }, "<0.6");
    },
  ],
};
export default scene;
