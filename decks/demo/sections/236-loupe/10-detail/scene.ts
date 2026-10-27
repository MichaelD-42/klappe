import { loupe, type LoupeHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned } from "../../../caption";

interface Refs {
  lens: LoupeHandle;
  chart: StepAdder;
  sketch: StepAdder;
}

// The points are scene units on the picture as it shows in the rect: the part, the big screen's chart, the
// wireframe on the small screen (sharp; the printed drawing in front is out of focus).
export default captioned("loupe(ctx, { href, alt, rect, r, zoom, at }) — and to(x, y, { zoom? }) slides the lens on", {
  build(ctx): Refs {
    const lens = loupe(ctx, {
      href: "media/fullscreen-hero.png",
      alt: "An engineer's desk at night: a machine part, a CAD screen and a printed drawing",
      rect: { x: 160, y: 60, w: 1600, h: 860 },
      fit: "cover",
      r: 160,
      zoom: 1.7,
      at: { x: 1328, y: 557 },
    });
    return { lens, chart: lens.to(1595, 404), sketch: lens.to(1165, 330, { zoom: 2.6 }) }; // a closer look at the sketch
  },
  steps: [(tl, r: Refs) => r.lens.show(tl), (tl, r: Refs) => r.chart(tl), (tl, r: Refs) => r.sketch(tl)],
});
