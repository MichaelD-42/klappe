import { handwrite, type HandwriteHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("handwrite(ctx, { text, x, y }) — the phrase writes itself, glyph by glyph", {
  build: (ctx) => handwrite(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 400, size: 160 }),
  steps: [(tl, h: HandwriteHandle) => h.write(tl)],
});
