import { bigType } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('bigType(ctx, { text, rect, media, alt }) — one word set edge to edge, a picture or a .mp4 showing through the letters', {
  build: (ctx) =>
    bigType(ctx, {
      text: "Shipping",
      rect: { x: 160, y: 140, w: 1600, h: 760 },
      media: "media/fullscreen-mood.png",
      alt: "A city at dusk: a river, bridges and lit towers",
    }),
  steps: [(tl, b: ReturnType<typeof bigType>) => b.show(tl)],
});
