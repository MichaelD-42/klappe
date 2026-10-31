import { endRoll } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('endRoll(ctx, { title, thanks }) — credits that scroll on the timeline and list every source the deck recorded', {
  build: (ctx) => endRoll(ctx, { title: "Sources", thanks: ["Thank you for listening"], rect: { x: 160, y: 120, w: 1600, h: 780 } }),
  steps: [(tl, e: ReturnType<typeof endRoll>) => e.show(tl)],
});
