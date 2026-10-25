import { flipCard, type FlipCardHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  q: FlipCardHandle;
  m: FlipCardHandle;
}

export default captioned("flipCard(ctx, { x, y, front, back }) — show, then each flip turns it over", {
  build: (ctx): Refs => ({
    q: flipCard(ctx, { x: 160, y: 280, w: 720, h: 420, front: "How long does a release take?", back: "Forty minutes, door to door." }),
    m: flipCard(ctx, { x: 1040, y: 280, w: 720, h: 420, front: "More testers make it faster.", back: "Smaller batches do." }),
  }),
  steps: [
    (tl, r: Refs) => {
      r.q.show(tl);
      r.m.show(tl);
    },
    (tl, r: Refs) => r.q.flip(tl),
    (tl, r: Refs) => r.m.flip(tl),
    (tl, r: Refs) => r.q.flip(tl),
  ],
});
