import { pyramid, title, type BasicHandle, type PyramidHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("pyramid(ctx, { layers, shape, … }) — next() builds the next layer up, light(id) lights one again", {
  build: (ctx) => ({
    h: title(ctx),
    p: pyramid(ctx, {
      x: 585, y: 300, w: 750, h: 560,
      layers: [
        { id: "unit", label: "Unit" },
        { id: "integration", label: "Integration" },
        { id: "contract", label: "Contract" },
        { id: "e2e", label: "End to end" },
      ],
    }),
  }),
  steps: [
    (tl, r: { h: BasicHandle; p: PyramidHandle }) => (r.h.show(tl), r.p.next()(tl)),
    (tl, r) => r.p.next()(tl),
    (tl, r) => r.p.next()(tl),
    (tl, r) => r.p.next()(tl),
    (tl, r) => r.p.light("contract")(tl),
  ],
});
