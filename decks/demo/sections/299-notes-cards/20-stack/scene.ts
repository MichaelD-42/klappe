import { cardStack, title, type BasicHandle, type CardStackHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("cardStack(ctx, { x, y, cards }) — pull(i) lifts one card out; back puts it back", {
  build: (ctx) => ({ h: title(ctx), c: cardStack(ctx, { x: 780, y: 380, cards: ["Speed", "Trust", "Focus", "Craft", "Fun"] }) }),
  steps: [
    (tl, r: { h: BasicHandle; c: CardStackHandle }) => (r.h.show(tl), r.c.show(tl)),
    (tl, r) => r.c.pull(1)(tl),
    (tl, r) => r.c.pull(2)(tl),
    (tl, r) => r.c.back(tl),
  ],
});
