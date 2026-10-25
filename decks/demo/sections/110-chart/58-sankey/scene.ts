import { chart } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned('chart({ type: "sankey" }) — where a total goes; highlight(row) lights one flow', {
  build: (ctx) => chart(ctx, { src: "data/chart-sankey.csv", type: "sankey", rect: { x: 160, y: 100, w: 1600, h: 820 }, title: "Where a month's visitors go" }),
  // Row 8 of the CSV (index 7): Trial to Paid.
  // The names come in with their nodes (grow), so axes and grow share step 1.
  steps: [(tl, c) => (c.axes(tl), c.grow(tl)), (tl, c) => c.values(tl), (tl, c) => c.highlight(7)(tl)],
});
