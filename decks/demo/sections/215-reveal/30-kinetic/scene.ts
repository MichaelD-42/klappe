import { reveal, type RevealHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('reveal(ctx, { text, by: "word" }) with **bold** key words — they grow and take the accent', {
  build: (ctx) => reveal(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 360, w: 1500, size: 72, by: "word" }),
  steps: [(tl, r: RevealHandle) => r.run(tl)],
});
