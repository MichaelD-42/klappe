import { pyramid, title, type BasicHandle, type PyramidHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('pyramid(ctx, { shape: "inverted", … }) — a funnel, widest on top', {
  build: (ctx) => ({
    h: title(ctx),
    p: pyramid(ctx, {
      x: 585, y: 300, w: 750, h: 560, shape: "inverted",
      layers: [
        { id: "hires", label: "Hires" },
        { id: "offers", label: "Offers" },
        { id: "interviews", label: "Interviews" },
        { id: "applications", label: "Applications" },
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
