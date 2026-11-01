import { establish, iconTile, type IconHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned, captionOf } from "../../../caption";

interface Refs {
  tile: IconHandle;
  out: StepAdder;
}

export default captioned("establish(ctx) pulls the camera out to every scene on the canvas; the next scene pushes in", {
  build: (ctx): Refs => ({ tile: iconTile(ctx, "map", { x: 960, y: 470, size: 240, tone: "accent" }), out: establish(ctx) }),
  steps: [
    (tl, r: Refs) => r.tile.draw(tl),
    // The caption would shrink with the scene: it fades as the camera pulls out.
    (tl, r: Refs, ctx) => (r.out(tl), tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 }, "<")),
  ],
});
