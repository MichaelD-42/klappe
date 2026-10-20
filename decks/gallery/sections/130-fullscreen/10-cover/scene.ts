import { image, type ImageHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('image({ fit: "cover", kenBurns: true, scrim: 0.6 }) — fills the frame, pushes in', {
  build: (ctx) =>
    image(ctx, {
      href: "media/fullscreen-hero.png",
      alt: "An engineering desk at night: CAD drawings on two monitors, a city skyline behind the window",
      fit: "cover",
      kenBurns: true,
      scrim: 0.6,
    }),
  steps: [(tl, img: ImageHandle) => img.show(tl)],
}, "fade");
