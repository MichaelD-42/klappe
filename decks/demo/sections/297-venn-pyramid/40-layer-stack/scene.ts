import { layerStack, type LayerStackHandle } from "klappe/fx";
import { captioned } from "../../../caption";

type R = { s: LayerStackHandle };

export default captioned("layerStack(ctx, { layers, … }) — apart() pulls the slabs open, light(i) points at one, together() closes the stack", {
  build: (ctx): R => ({
    s: layerStack(ctx, {
      x: 260, y: 120, w: 1400, h: 760,
      layers: [
        { label: "Apps", note: "Web, mobile and the admin console" },
        { label: "Services", note: "One per business capability" },
        { label: "Data", note: "Each service owns its store" },
        { label: "Platform", note: "Kubernetes, queues, observability" },
      ],
    }),
  }),
  steps: [
    (tl, r: R) => r.s.show(tl),
    (tl, r: R) => r.s.apart(tl),
    (tl, r: R) => r.s.light(1)(tl),
    (tl, r: R) => r.s.light(2)(tl),
    (tl, r: R) => r.s.together(tl),
  ],
});
