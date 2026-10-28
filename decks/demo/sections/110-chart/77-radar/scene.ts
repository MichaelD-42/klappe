import { chart } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('chart({ type: "radar" }) — a profile round a circle; c.highlight(1) lights one', {
  build: (ctx) => chart(ctx, { src: "data/chart-radar.csv", type: "radar", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Two candidates, scored 1 to 10" }),
  steps: [(tl, c) => c.axes(tl), (tl, c) => c.grow(tl), (tl, c) => c.highlight(1)(tl)],
});
