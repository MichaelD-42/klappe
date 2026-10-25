import { pyramid, title, type BasicHandle, type PyramidHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("pyramid(ctx, { layers, shape, … }) — next() builds the next layer up", {
  build: (ctx) => ({
    h: title(ctx),
    p: pyramid(ctx, {
      x: 510, y: 270, w: 900, h: 670,
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
  ],
});
