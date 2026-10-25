import { follow, iconTile, impactShake, travel, type IconHandle, type TravelHandle } from "klappe/fx";
import type { StepAdder } from "klappe/types";
import { captioned, captionOf } from "../../../caption";

interface Refs {
  tiles: IconHandle[];
  ship: TravelHandle;
  cam: StepAdder;
  land: StepAdder;
  back: StepAdder;
}

// The parcel sits at the scene origin, centred there: travel moves that point along the path. follow reads the same
// path, so the camera keeps the parcel in the middle; impactShake jolts the scene once the parcel has landed.
export default captioned("follow(ctx, travel(…)) keeps the parcel centred; impactShake(ctx) jolts it as it lands", {
  build(ctx): Refs {
    const from = iconTile(ctx, "warehouse", { x: 260, y: 700, size: 140, tone: "accent" });
    const to = iconTile(ctx, "house", { x: 1660, y: 420, size: 140, tone: "ok" });
    const parcel = iconTile(ctx, "package", { x: 0, y: 0, size: 88, tone: "warn" });
    const ship = travel(ctx, parcel.el, { path: "M410 700 C 800 260, 1150 900, 1546 420", route: "draw", duration: 3 });
    ctx.svg.setAttribute("data-k-bleed", ""); // the route runs off the frame while the camera follows
    return {
      tiles: [from, to, parcel],
      ship,
      cam: follow(ctx, ship, { zoom: 1.8 }),
      land: impactShake(ctx),
      back: (tl) => ctx.camera.to(tl, ctx.rect),
    };
  },
  steps: [
    (tl, r: Refs) => r.tiles.forEach((t, i) => t.draw(tl, i ? "<" : undefined)),
    // The caption fades as the camera closes in (it would leave the frame); the shake starts when the travel ends.
    (tl, r: Refs, ctx) => (r.ship(tl), r.cam(tl), tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 }, "<"), r.land(tl)),
    (tl, r: Refs, ctx) => (r.back(tl), tl.to(captionOf(ctx), { autoAlpha: 1, duration: 0.6 }, "<")),
  ],
});
