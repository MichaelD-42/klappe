import { loupe, type LoupeHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned } from "../../../caption";

interface Refs {
  lens: LoupeHandle;
  chart: StepAdder;
  drawing: StepAdder;
}

// The points are scene units on the picture as it shows in the rect: the part, the screen's chart, the drawing.
export default captioned("loupe(ctx, { href, alt, rect, r, zoom, at }) — and to(x, y) slides the lens on", {
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
    return { lens, chart: lens.to(1595, 404), drawing: lens.to(973, 748) };
  },
  steps: [(tl, r: Refs) => r.lens.show(tl), (tl, r: Refs) => r.chart(tl), (tl, r: Refs) => r.drawing(tl)],
});
