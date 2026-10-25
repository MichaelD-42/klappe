import { dollyZoom, iconTile, type IconHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned, captionOf } from "../../../caption";

interface Refs {
  tiles: IconHandle[];
  out: StepAdder;
  back: StepAdder;
}

// The rocket holds its size while the camera pulls back from it: the tiles around it shrink, the background grows.
export default captioned("dollyZoom(ctx, { target }) — the vertigo move: the target holds, the world around it shifts", {
  background: { href: "media/fullscreen-background.png", alt: "Blue light waves on a dark background", scrim: 0.6 },
  build(ctx): Refs {
    const rocket = iconTile(ctx, "rocket", { x: 960, y: 470, size: 240, tone: "accent" });
    const tiles = [
      rocket,
      iconTile(ctx, "lightbulb", { x: 360, y: 300, size: 120, tone: "warn" }),
      iconTile(ctx, "cpu", { x: 1560, y: 300, size: 120, tone: "ok" }),
      iconTile(ctx, "search", { x: 420, y: 700, size: 120, tone: "ok" }),
      iconTile(ctx, "shield-check", { x: 1500, y: 700, size: 120, tone: "warn" }),
    ];
    return { tiles, out: dollyZoom(ctx, { target: rocket.el, amount: 1.8 }), back: dollyZoom(ctx, { target: rocket.el, amount: 1 }) };
  },
  steps: [
    (tl, r: Refs) => r.tiles.forEach((t, i) => t.draw(tl, i ? "<" : undefined)),
    // The caption would shrink with the scene: it fades for the move and comes back with the frame.
    (tl, r: Refs, ctx) => (r.out(tl), tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 }, "<")),
    (tl, r: Refs, ctx) => (r.back(tl), tl.to(captionOf(ctx), { autoAlpha: 1, duration: 0.6 }, ">")), // after the landing: with reduced motion the flight is a cut
  ],
});
