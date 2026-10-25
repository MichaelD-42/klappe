import { gauge, type GaugeHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("gauge(ctx, { value, max, unit }) — then g.to(value) swings the needle on", {
  build: (ctx): GaugeHandle => gauge(ctx, { x: 560, y: 140, size: 800, value: 68, max: 100, unit: "%", label: "Build farm load", source: "klappe demo sample" }),
  steps: [(tl, g: GaugeHandle) => g.show(tl), (tl, g: GaugeHandle) => g.to(91)(tl)],
});
