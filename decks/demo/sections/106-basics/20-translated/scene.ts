import { text, title, type BasicHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  h: BasicHandle;
  a: BasicHandle;
  b: BasicHandle;
}

export default captioned('ctx.t("…") gives a scene.ts string in the language shown: S, or ?lang=de', {
  build: (ctx): Refs => ({
    h: title(ctx),
    a: text(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 360, w: 1500 }),
    b: text(ctx, { text: ctx.t("This box is a string in scene.ts, passed through ctx.t()."), x: 160, y: 520, w: 1500, size: 36, color: "--k-muted" }),
  }),
  steps: [
    (tl, r: Refs) => (r.h.show(tl), r.a.show(tl)),
    (tl, r: Refs) => r.b.show(tl),
  ],
});
