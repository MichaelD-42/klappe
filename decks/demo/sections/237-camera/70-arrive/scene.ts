import { iconTile, type IconHandle } from "klappe/fx";
import { captioned } from "../../../caption";

export default captioned("The flight in starts from the establishing shot's view", {
  build: (ctx): { tile: IconHandle } => ({ tile: iconTile(ctx, "map-pin", { x: 960, y: 470, size: 240, tone: "ok" }) }),
  steps: [(tl, r: { tile: IconHandle }) => r.tile.draw(tl)],
});
