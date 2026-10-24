import { drawOn, image } from "klappe/fx";
import type { Rect, SceneModule } from "klappe/types";
import { GROW, grow, heading } from "../section";

const SEG = 1.1; // seconds for the stream to draw from one stage to the next, with the camera on it
const HOLD = 0.6; // seconds the camera rests on a stage while it draws
const TOUR = { w: 1440, h: 810 }; // the camera's frame on the stream band during the draw
const AIR = 120; // stage px around the last two stages when the tour ends
const BAND = 942; // the band's vertical centre: from the tile tops (817) to the box bottoms (1067)
const GROWN_BAND = 852; // the same once grown: tile tops 634 to box bottoms 1070
// The pulled-back frame, in screen px: title on top, the band in the middle third, the caption below it,
// and the grown stream from the title's left edge to a right margin. The walk measures SVG text without its
// group scale, so the 62 px labels need camera scale >= 0.32 to pass 14 px at 1366: keep right at 1800.
const REST = { left: 160, right: 1800, title: 140, band: 520, caption: 760 };
const CAPTION = "This is how work flows today."; // the scene's speaker note, word for word

// The grown stream in a 16:9 frame: s is the camera scale; title and caption are top-left corners.
function rest(stream: Record<string, any>) {
  const b: Rect = stream.bounds;
  const half = Number(stream.boxes[0].querySelector("rect").getAttribute("width")) / 2;
  const [x0, x1] = [b.x + half - half * GROW.box, b.x + b.w - half + half * GROW.box];
  const s = (REST.right - REST.left) / (x1 - x0);
  const frame = { x: x0 - REST.left / s, y: GROWN_BAND - REST.band / s, w: 1920 / s, h: 1080 / s };
  return { s, frame, title: { x: x0, y: frame.y + REST.title / s }, caption: { x: x0, y: frame.y + REST.caption / s } };
}

const scene: SceneModule = {
  build(ctx) {
    // First, so the title paints above it. The scrim keeps the title readable on the bright whiteboard.
    const hero = image(ctx, {
      href: "media/value-stream-hero.png",
      alt: "A hand sketches a process flow on a whiteboard: five circled icons joined by arrows",
      fit: "cover",
      kenBurns: true,
      scrim: 0.6,
    });
    const title = heading(ctx, ctx.doc!.title);
    // The same heading for the pulled-back view, sized so it reads like every other scene title, and a caption.
    const { s, title: at, caption: under } = rest(ctx.canvas.refs.stream);
    const big = heading(ctx, ctx.doc!.title);
    const caption = heading(ctx, CAPTION);
    const place = (e: HTMLElement, p: { x: number; y: number }, px: number) =>
      Object.assign(e.style, {
        position: "absolute", margin: "0", width: "max-content",
        left: `${p.x - ctx.rect.x}px`, top: `${p.y - ctx.rect.y}px`, fontSize: `${px / s}px`,
      });
    place(big, at, 88);
    place(caption, under, 48);
    caption.style.fontWeight = "400";
    return { hero, title, big, caption };
  },
  steps: [
    // The hero picture, with the title over it.
    (tl, r) => {
      r.hero.show(tl);
      tl.to(r.title, { autoAlpha: 1, duration: 0.6 }, "<0.4");
    },
    (tl, r, ctx) => {
      r.hero.hide(tl); // gone before the stream draws and the camera moves
      const { line, boxes, tiles, bounds: b } = ctx.canvas.refs.stream;
      const length = Number(line.getAttribute("stroke-dasharray"));
      const stage = (i: number, at: number) => {
        drawOn(boxes[i].querySelector("rect"), { at, duration: 0.7 })(tl);
        tl.fromTo(boxes[i].querySelector("text"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, at + 0.3);
        tiles[i].draw(tl, at);
      };
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
      const stream = ctx.canvas.refs.stream;
      ctx.camera.to(tl, rest(stream).frame);
      grow(tl, stream, true, "<"); // the stages grow as the camera pulls back
      tl.to(r.big, { autoAlpha: 1, duration: 0.6 }, "<0.6");
      tl.to(r.caption, { autoAlpha: 1, duration: 0.6 }, "<0.4");
    },
  ],
};
export default scene;
