import { image, type ImageHandle } from "klappe/fx";
import { captioned } from "../../../caption";

// No kenBurns here: show() would play the push too, and move() would then start it again.
export default captioned("img.show(tl) · img.move(tl) · img.hide(tl) — one step each", {
  build: (ctx) =>
    image(ctx, {
      href: "media/fullscreen-hero.png",
      alt: "An engineering desk at night: CAD drawings on two monitors, a city skyline behind the window",
      fit: "cover",
      scrim: 0.6,
    }),
  steps: [
    (tl, img: ImageHandle) => img.show(tl),
    (tl, img: ImageHandle) => img.move(tl, { duration: 3 }),
    (tl, img: ImageHandle) => img.hide(tl),
  ],
});
