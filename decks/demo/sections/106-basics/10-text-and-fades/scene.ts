import { hide, show, text, title, type BasicHandle } from "klappe/fx";
import { captioned } from "../../../caption";

interface Refs {
  h: BasicHandle;
  a: BasicHandle;
  b: BasicHandle;
  c: BasicHandle;
}

export default captioned("title(ctx) and text(ctx, { x, y, w, color }) build hidden; show(el) and hide(el) fade in and out", {
  build: (ctx): Refs => ({
    h: title(ctx),
    a: text(ctx, { text: "A text box at x, y, wrapped at w, in --k-fg.", x: 160, y: 360, w: 1500 }),
    b: text(ctx, { text: "color takes a theme token: --k-muted", x: 160, y: 520, w: 740, size: 36, color: "--k-muted" }),
    c: text(ctx, { text: "--k-accent, weight 700", x: 960, y: 520, w: 800, size: 36, color: "--k-accent", weight: 700 }),
  }),
  steps: [
    (tl, r: Refs) => (r.h.show(tl), r.a.show(tl)),
    (tl, r: Refs) => show([r.b.el, r.c.el])(tl),
    (tl, r: Refs) => hide(r.a.el)(tl),
    (tl, r: Refs) => show(r.a.el)(tl),
  ],
});
