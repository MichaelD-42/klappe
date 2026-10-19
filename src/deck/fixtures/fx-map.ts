import { assembleDeck } from "../assemble";
import { worldMap, type WorldMapHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// Placeholder sites at plausible land coordinates; not real locations of anyone.
const sites = [
  { id: "s1", label: "[Site 1]", lon: 10, lat: 50 },
  { id: "s2", label: "[Site 2]", lon: -95, lat: 40 },
  { id: "s3", label: "[Site 3]", lon: 105, lat: 35 },
  { id: "s4", label: "[Site 4]", lon: -55, lat: -12 },
];

// Every other site links to the host, Site 1.
const toHost = sites.slice(1).map((s) => ({ from: s.id, to: "s1" }));

// Full frame, arcs declared up front: zoom, back to world, zoom again; then zoom straight to another site
// (the first label must hide).
const world: SceneModule = {
  build: (ctx) => worldMap(ctx, { rect: { x: 60, y: 60, w: 1800, h: 960 }, sites, arcs: toHost }),
  steps: [
    (tl, m: WorldMapHandle) => m.draw(tl),
    (tl, m: WorldMapHandle) => sites.forEach((s) => m.site(tl, s.id)),
    (tl, m: WorldMapHandle) => toHost.forEach((a) => m.arc(tl, a.from, a.to)),
    (tl, m: WorldMapHandle) => m.zoomTo(tl, "s2"),
    (tl, m: WorldMapHandle) => m.world(tl),
    (tl, m: WorldMapHandle) => m.zoomTo(tl, "s3"),
    (tl, m: WorldMapHandle) => m.zoomTo(tl, "s4"),
  ],
};

// A map in part of the frame: an arc not declared up front, and a zoom to a site without a site step first.
const inset: SceneModule = {
  build: (ctx) => worldMap(ctx, { rect: { x: 760, y: 200, w: 1100, h: 680 }, sites: sites.slice(0, 2) }),
  steps: [
    (tl, m: WorldMapHandle) => m.draw(tl),
    (tl, m: WorldMapHandle) => m.site(tl, "s1"),
    (tl, m: WorldMapHandle) => m.arc(tl, "s2", "s1"),
    (tl, m: WorldMapHandle) => m.zoomTo(tl, "s2"),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-world/scene.md": "## World\n\n- Draw.\n- Sites.\n- Arcs to the host.\n- Zoom two.\n- World.\n- Zoom three.\n- Zoom four.\n",
      "sections/10-a/20-inset/scene.md": "## Inset\n\n- Draw.\n- Site.\n- Arc.\n- Zoom.\n",
    },
    { "sections/10-a/10-world/scene.ts": world, "sections/10-a/20-inset/scene.ts": inset },
  );
