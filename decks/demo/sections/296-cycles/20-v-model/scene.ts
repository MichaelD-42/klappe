import { title, vModel, type BasicHandle, type VModelHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("vModel(ctx, { levels: [{ left, right }], … }) — level(i) lights a pair, link(i) the check across", {
  build: (ctx) => ({
    h: title(ctx),
    v: vModel(ctx, {
      x: 160, y: 280, w: 1600, h: 660,
      levels: [
        { left: "Requirements", right: "Acceptance test" },
        { left: "System design", right: "System test" },
        { left: "Architecture", right: "Integration test" },
        { left: "Module design", right: "Unit test" },
      ],
    }),
  }),
  steps: [
    (tl, r: { h: BasicHandle; v: VModelHandle }) => (r.h.show(tl), r.v.show(tl)),
    (tl, r) => r.v.level(0)(tl),
    (tl, r) => r.v.link(0)(tl),
    (tl, r) => r.v.level(3)(tl),
    (tl, r) => r.v.link(3)(tl),
  ],
});
