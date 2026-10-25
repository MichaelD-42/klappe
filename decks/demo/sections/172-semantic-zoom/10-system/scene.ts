import { semanticZoom, type SemanticZoomHandle } from "klappe/fx";
import { captioned, captionOf } from "../../../caption";

type R = { z: SemanticZoomHandle };

// The caption sits outside the boxes: it fades for the dive and comes back at the top level.
export default captioned('semanticZoom(ctx, { boxes, x, y, w, h }) — into(["Shop"]) flies in and builds what is inside', {
  build: (ctx): R => ({
    z: semanticZoom(ctx, {
      x: 160, y: 120, w: 1600, h: 760,
      boxes: [
        {
          label: "Online shop",
          children: [
            { label: "Web app" },
            { label: "API", children: [{ label: "Orders" }, { label: "Payments" }, { label: "Stock" }, { label: "Sign-in" }] },
            { label: "Database" },
          ],
        },
        { label: "Payment provider" },
        { label: "Warehouse" },
      ],
    }),
  }),
  steps: [
    (tl, r: R) => r.z.show(tl),
    (tl, r: R, ctx) => (tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 }), r.z.into(["Online shop"])(tl)),
    (tl, r: R) => r.z.into(["Online shop", "API"])(tl),
    (tl, r: R) => r.z.out(tl),
    (tl, r: R, ctx) => (r.z.out(tl), tl.to(captionOf(ctx), { autoAlpha: 1, duration: 0.6 })),
  ],
});
