import { pyramid, type PyramidHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("pyramid(ctx, { layers, shape, … }) — next() builds the next layer up", {
  build: (ctx) => ({
    p: pyramid(ctx, {
      x: 460, y: 120, w: 1000, h: 800,
      layers: [
        { id: "unit", label: "Unit" },
        { id: "integration", label: "Integration" },
        { id: "contract", label: "Contract" },
        { id: "e2e", label: "End to end" },
      ],
    }),
  }),
  steps: [
    (tl, r: { p: PyramidHandle }) => r.p.next()(tl),
    (tl, r) => r.p.next()(tl),
    (tl, r) => r.p.next()(tl),
    (tl, r) => r.p.next()(tl),
  ],
});
