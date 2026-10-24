import { reveal, type RevealHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("reveal(ctx, { text, x, y }) — the source lines rise in, one after another", {
  build: (ctx) => reveal(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 340, size: 72 }),
  steps: [(tl, r: RevealHandle) => r.run(tl)],
});
