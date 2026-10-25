import { icon, iconTile, travel, type IconHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned } from "../../../caption";

interface Refs {
  tiles: IconHandle[];
  plane: IconHandle;
  ship: StepAdder;
  reply: StepAdder;
}

// The parcel and the plane sit at the scene origin, centred there: travel moves that point along the path. The parcel
// stops against the house tile, the plane on the warehouse tile.
export default captioned('travel(ctx, el, { path, route: "draw" }) — and { rotate: true } turns it along the path', {
  build(ctx): Refs {
    const from = iconTile(ctx, "warehouse", { x: 260, y: 700, size: 140, tone: "accent" });
    const to = iconTile(ctx, "house", { x: 1660, y: 420, size: 140, tone: "ok" });
    const parcel = iconTile(ctx, "package", { x: 0, y: 0, size: 88, tone: "warn" });
    const plane = icon(ctx, "send-horizontal", { x: 0, y: 0, size: 72, color: "var(--k-fg)" });
    return {
      tiles: [from, to, parcel],
      plane,
      ship: travel(ctx, parcel.el, { path: "M410 700 C 800 260, 1150 900, 1546 420", route: "draw", duration: 2.5 }),
      reply: travel(ctx, plane.el, { path: "M1600 280 C 1200 60, 700 120, 260 640", rotate: true, duration: 2 }),
    };
  },
  steps: [
    (tl, r: Refs) => r.tiles.forEach((t, i) => t.draw(tl, i ? "<" : undefined)),
    (tl, r: Refs) => r.ship(tl),
    (tl, r: Refs) => (r.reply(tl), r.plane.draw(tl, "<")), // the plane draws on as it flies
  ],
});
