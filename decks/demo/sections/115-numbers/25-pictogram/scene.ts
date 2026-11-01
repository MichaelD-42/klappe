import { waffle, type StatHandle } from "klappe/fx";
import { captioned } from "../../../caption";

const SOURCE = "klappe demo sample";

export default captioned('waffle(ctx, { units: 8, icon: "user" }): a pictogram, one icon per unit, then to(value)', {
  build: (ctx): StatHandle => waffle(ctx, { x: 260, y: 300, size: 1400, value: 25, units: 8, icon: "user", label: "of 8 engineers on call", source: SOURCE }),
  steps: [(tl, w: StatHandle) => w.show(tl), (tl, w: StatHandle) => w.to(12.5)(tl)],
});
