import { iconTile, tilt, type IconHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned, captionOf } from "../../../caption";

interface Refs {
  tiles: IconHandle[];
  there: StepAdder;
  back: StepAdder;
}

// The scene sits far below the row of scenes, so the zoomed-out flight shows empty stage round the lean;
// the far tile is 1.25 frames to its left: long enough to lean, short enough that the tiles stay big.
export default captioned("tilt(ctx, rect) flies the camera with a slight 3D lean that lands flat", {
  place: () => ({ x: 3840, y: 3000, w: 1920, h: 1080 }),
  build(ctx): Refs {
    const far = { ...ctx.rect, x: ctx.rect.x - 2400 };
    return {
      tiles: [
        iconTile(ctx, "house", { x: 960, y: 480, size: 220, tone: "accent" }),
        iconTile(ctx, "warehouse", { x: 960 - 2400, y: 480, size: 220, tone: "ok" }),
      ],
      there: tilt(ctx, far),
      back: tilt(ctx, ctx.rect),
    };
  },
  steps: [
    (tl, r: Refs) => r.tiles.forEach((t, i) => t.draw(tl, i ? "<" : undefined)),
    // The caption fades as the camera leaves (it would fly off with the scene), and comes back on the way home.
    (tl, r: Refs, ctx) => (r.there(tl), tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 }, "<")),
    (tl, r: Refs, ctx) => (r.back(tl), tl.to(captionOf(ctx), { autoAlpha: 1, duration: 0.6 }, ">")), // after the landing: with reduced motion the flight is a cut
  ],
});
