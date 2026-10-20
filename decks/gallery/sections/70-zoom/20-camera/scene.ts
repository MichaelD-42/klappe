import { iconTile, type IconHandle } from "klappe/fx";
import { captioned, captionOf } from "../../10-chart/section";

// The caption sits outside the zoomed frame, so it leaves with the camera and comes back with it.
export default captioned("ctx.camera.to(tl, rect) — the camera zooms into part of the scene and back", {
  build: (ctx) => [
    iconTile(ctx, "search", { x: 480, y: 480, size: 200, tone: "accent" }),
    iconTile(ctx, "lightbulb", { x: 960, y: 480, size: 200, tone: "phosphor-amber" }),
    iconTile(ctx, "rocket", { x: 1440, y: 480, size: 200, tone: "accent" }),
  ],
  steps: [
    (tl, tiles: IconHandle[]) => tiles.forEach((t, n) => t.draw(tl, n ? "<" : undefined)),
    (tl, tiles: IconHandle[], ctx) => {
      tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 });
      // A 16:9 frame around the middle tile, in canvas coordinates.
      ctx.camera.to(tl, { x: ctx.rect.x + 960 - 320, y: ctx.rect.y + 480 - 180, w: 640, h: 360 }, { duration: 1.2 });
      tiles[1].light(tl);
    },
    (tl, _tiles: IconHandle[], ctx) => {
      ctx.camera.to(tl, ctx.rect, { duration: 1.2 });
      tl.to(captionOf(ctx), { autoAlpha: 1, duration: 0.6 });
    },
  ],
});
