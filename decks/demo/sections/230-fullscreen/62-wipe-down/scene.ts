import { wipe, type WipeHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('wipe(ctx, { before, after, direction: "vertical" }) — from the top', {
  build: (ctx) =>
    wipe(ctx, {
      before: { href: "media/fullscreen-hero.png", alt: "An engineering desk at night: CAD drawings on two monitors, a city skyline behind the window" },
      after: { href: "media/fullscreen-mood.png", alt: "A city at dusk: a river, bridges and lit towers" },
      scrim: 0.6,
      direction: "vertical",
    }),
  steps: [(tl, w: WipeHandle) => w.show(tl), (tl, w: WipeHandle) => w.to(1)(tl)],
});
