import { iconTile, type IconHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned, captionOf } from "../../../caption";

interface Refs {
  tile: IconHandle;
  push: StepAdder;
}

// Four frames right of the dolly scene, so the entry is a long flight; camera: { whip: true } makes it a fast blurred pan.
export default captioned('scene.ts camera: { whip: true } — a fast pan with motion blur; camera.to(tl, rect, { duration, ease }) — a slow push', {
  place: (rects) => ({ ...rects.dolly, x: rects.dolly.x + 4 * 1920 }),
  camera: { whip: true },
  build(ctx): Refs {
    const tile = iconTile(ctx, "shield-check", { x: 960, y: 470, size: 240, tone: "accent" });
    const { x, y, w, h } = ctx.rect;
    const near = { x: x + 960 - w * 0.3, y: y + 470 - h * 0.3, w: w * 0.6, h: h * 0.6 }; // centred on the shield
    return { tile, push: (tl) => ctx.camera.to(tl, near, { duration: 4, ease: "sine.inOut" }) };
  },
  steps: [
    (tl, r: Refs) => r.tile.draw(tl),
    // The caption would grow with the scene: it fades for the push.
    (tl, r: Refs, ctx) => (r.push(tl), tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 }, "<")),
  ],
});
