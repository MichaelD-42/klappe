import { reveal, type RevealHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('reveal(ctx, { text, x, y, by: "word" }) — the words rise in, in order', {
  build: (ctx) => reveal(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 380, w: 1400, size: 64, by: "word" }),
  steps: [(tl, r: RevealHandle) => r.run(tl)],
});
