import { chart } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("chart({ columns: [\"2024\", \"2025\"] }) — to(\"2025\") moves the bars on one axis", {
  build: (ctx) => chart(ctx, { src: "data/chart-years.csv", type: "bar", columns: ["2024", "2025"], rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Releases a quarter" }),
  steps: [(tl, c) => (c.axes(tl), c.grow(tl), c.values(tl)), (tl, c) => c.to("2025")(tl)],
});
