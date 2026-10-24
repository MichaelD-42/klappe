import { scramble, type ScrambleHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("scramble(ctx, { text, x, y }) — glyphs settle on the text, left to right", {
  build: (ctx) => scramble(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 420, w: 1600 }),
  steps: [(tl, s: ScrambleHandle) => s.run(tl)],
});
