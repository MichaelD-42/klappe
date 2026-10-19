import { chart } from "klappe/fx";
import type { SceneModule } from "klappe/types";

const scene: SceneModule = {
  build: (ctx) => chart(ctx, { src: "data/numbers-stacked.csv", type: "stacked", rect: { x: 160, y: 120, w: 1600, h: 840 }, title: "Units by product" }),
  steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.values(tl)],
};
export default scene;
