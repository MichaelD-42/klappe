import { worldMap, type WorldMapHandle } from "klappe/fx";
import { captioned, captionOf } from "../../../caption";

// Placeholder sites at plausible land coordinates; not real locations of anyone.
const sites = [
  { id: "s1", label: "[Site 1]", lon: 10, lat: 50 },
  { id: "s2", label: "[Site 2]", lon: -95, lat: 40 },
  { id: "s3", label: "[Site 3]", lon: 105, lat: 35 },
  { id: "s4", label: "[Site 4]", lon: -55, lat: -12 },
];
// Every other site links to the host, Site 1.
const toHost = sites.slice(1).map((s) => ({ from: s.id, to: "s1" }));

// The caption leaves with the camera on the zoom and comes back with the whole world.
export default captioned(
  "worldMap(ctx, { rect, sites, arcs }) — m.draw, m.site, m.arc, m.zoomTo, m.world, m.region",
  {
    build: (ctx) => worldMap(ctx, { rect: { x: 60, y: 40, w: 1800, h: 880 }, sites, arcs: toHost }),
    steps: [
      (tl, m: WorldMapHandle) => m.draw(tl),
      (tl, m: WorldMapHandle) => sites.forEach((s) => m.site(tl, s.id)),
      (tl, m: WorldMapHandle) => toHost.forEach((a) => m.arc(tl, a.from, a.to)),
      (tl, m: WorldMapHandle, ctx) => (tl.to(captionOf(ctx), { autoAlpha: 0, duration: 0.3 }), m.zoomTo(tl, "s2")),
      (tl, m: WorldMapHandle, ctx) => (m.world(tl), tl.to(captionOf(ctx), { autoAlpha: 1, duration: 0.6 })),
      (tl, m: WorldMapHandle) => ["Germany", "Brazil", "Japan"].forEach((c) => m.region(tl, c)),
    ],
  },
  "shatter",
);
