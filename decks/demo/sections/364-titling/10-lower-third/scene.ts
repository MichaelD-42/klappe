import { lowerThird } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('lowerThird(ctx, { name, role, rect }) — a name and role at the lower left; show slides it in, hide slides it out', {
  build: (ctx) => lowerThird(ctx, { name: "Mira Okafor", role: "Analyst, Analytical Engines Ltd.", rect: { x: 160, y: 120, w: 1600, h: 780 } }),
  steps: [(tl, l: ReturnType<typeof lowerThird>) => l.show(tl), (tl, l: ReturnType<typeof lowerThird>) => l.hide(tl)],
});
