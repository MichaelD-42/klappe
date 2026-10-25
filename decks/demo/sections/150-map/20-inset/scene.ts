import { worldMap, type WorldMapHandle } from "klappe/fx";
import { captioned, captionOf } from "../../../caption";

// Placeholder sites at plausible land coordinates; not real locations of anyone.
const sites = [
  { id: "s1", label: "[Site 1]", lon: 10, lat: 50 },
  { id: "s2", label: "[Site 2]", lon: -95, lat: 40 },
];

// An arc not declared up front, and a zoom to a site without a site step first.
export default captioned("worldMap() in a smaller rect — m.arc(tl, from, to) draws an arc made on the spot", {
  build: (ctx) => {
    const m = worldMap(ctx, { rect: { x: 760, y: 200, w: 1100, h: 680 }, sites });
    ctx.svg.querySelector("[data-k-map]")?.setAttribute("data-k-bleed", ""); // the zoom runs the land off the frame by design
    return m;
  },
  steps: [
    (tl, m: WorldMapHandle) => m.draw(tl),
    (tl, m: WorldMapHandle) => m.site(tl, "s1"),
    (tl, m: WorldMapHandle) => m.arc(tl, "s2", "s1"),
    (tl, m: WorldMapHandle, ctx) => (tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 }), m.zoomTo(tl, "s2")),
  ],
});
