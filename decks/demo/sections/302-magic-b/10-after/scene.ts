import { iconTile } from "klappe/fx";
import { captioned } from "../../../caption";
import { planChip } from "../../301-magic-a/section";

export default captioned(
  'section.ts { transition: "magicMove" } — matched elements fly, the rest fades',
  {
    build(ctx) {
      const tile = iconTile(ctx, "rocket", { x: 480, y: 560, size: 320, tone: "accent" });
      tile.el.dataset.kMatch = "rocket";
      return { chip: planChip(ctx, 900, 480, 96), tile };
    },
    steps: [
      (tl, { chip, tile }) => (tl.to(chip, { autoAlpha: 1, duration: 0.6 }), tile.draw(tl, "<")),
      (tl, { tile }) => tile.light(tl),
    ],
  },
  "magicMove",
);
