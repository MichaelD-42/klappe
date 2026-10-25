import { redline, type RedlineHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("redline(ctx, { before, after, x, y }) — apply marks the changes, clean removes the marks", {
  build: (ctx) =>
    redline(ctx, {
      before: "Every release is tested by hand on Friday and shipped to all customers at once.",
      after: "Every release is tested automatically on each commit and shipped to customers in stages.",
      x: 160, y: 300, w: 1600, size: 64,
    }),
  steps: [(tl, r: RedlineHandle) => r.show(tl), (tl, r: RedlineHandle) => r.apply(tl), (tl, r: RedlineHandle) => r.clean(tl)],
});
