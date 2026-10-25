import { iconTile } from "klappe/fx";
import { captioned } from "../../../caption";
import { planChip } from "../../../shared/plan-chip";

export default captioned('el.dataset.kMatch = "plan" — an element with the same key in the next section flies there', {
  build(ctx) {
    const tile = iconTile(ctx, "rocket", { x: 1560, y: 700, size: 120, tone: "accent" });
    tile.el.dataset.kMatch = "rocket";
    return { chip: planChip(ctx, 160, 200, 48), tile };
  },
  steps: [(tl, { chip, tile }) => (tl.to(chip, { autoAlpha: 1, duration: 0.6 }), tile.draw(tl, "<"))],
});
