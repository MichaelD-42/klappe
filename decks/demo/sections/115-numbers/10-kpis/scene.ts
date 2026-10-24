import { kpi, type StatHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const SOURCE = "klappe demo sample";

export default captioned('kpi(ctx, { value, label, previous, better, spark }) — the change is green when it goes the good way', {
  build: (ctx): StatHandle[] => [
    kpi(ctx, { x: 160, y: 200, w: 500, value: 1284, label: "Orders this month", previous: 1146, spark: [980, 1020, 1100, 1146, 1210, 1284], source: SOURCE }),
    kpi(ctx, { x: 710, y: 200, w: 500, value: 9.5, unit: "days", label: "Lead time", previous: 12.5, better: "down", spark: [14, 13, 12.5, 11, 10, 9.5], source: SOURCE }),
    kpi(ctx, { x: 1260, y: 200, w: 500, value: 4.1, unit: "%", label: "Change failure rate", previous: 3.2, better: "down", spark: [2.8, 3.0, 3.2, 3.6, 4.1], source: SOURCE }),
  ],
  steps: [(tl, s: StatHandle[]) => s.forEach((h) => h.show(tl))],
});
