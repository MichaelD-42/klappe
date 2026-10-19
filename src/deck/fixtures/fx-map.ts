import { assembleDeck } from "../assemble";
import { worldMap, type WorldMapHandle } from "../../fx/map";
import type { SceneModule } from "../../types";

// Placeholder sites at plausible land coordinates; not real locations of anyone.
const sites = [
  { id: "s1", label: "[Site 1]", lon: 10, lat: 50 },
  { id: "s2", label: "[Site 2]", lon: -95, lat: 40 },
  { id: "s3", label: "[Site 3]", lon: 105, lat: 35 },
  { id: "s4", label: "[Site 4]", lon: -55, lat: -12 },
];

// Full frame: every step adder, two zooms in a row (the first label must hide).
const world: SceneModule = {
  build: (ctx) => worldMap(ctx, { rect: { x: 60, y: 60, w: 1800, h: 960 }, sites }),
  steps: [
    (tl, m: WorldMapHandle) => m.draw(tl),
    (tl, m: WorldMapHandle) => sites.forEach((s) => m.site(tl, s.id)),
    (tl, m: WorldMapHandle) => m.arc(tl, "s1", "s2"),
    (tl, m: WorldMapHandle) => m.arc(tl, "s3", "s4"),
    (tl, m: WorldMapHandle) => m.zoomTo(tl, "s2"),
    (tl, m: WorldMapHandle) => m.zoomTo(tl, "s3"),
  ],
};

// A map in part of the frame, with a site that zooms in without a site step first.
const inset: SceneModule = {
  build: (ctx) => worldMap(ctx, { rect: { x: 760, y: 200, w: 1100, h: 680 }, sites: sites.slice(0, 2) }),
  steps: [
    (tl, m: WorldMapHandle) => m.draw(tl),
    (tl, m: WorldMapHandle) => m.site(tl, "s1"),
    (tl, m: WorldMapHandle) => m.zoomTo(tl, "s2"),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-world/scene.md": "## World\n\n- Draw.\n- Sites.\n- Arc one.\n- Arc two.\n- Zoom two.\n- Zoom three.\n",
      "sections/10-a/20-inset/scene.md": "## Inset\n\n- Draw.\n- Site.\n- Zoom.\n",
    },
    { "sections/10-a/10-world/scene.ts": world, "sections/10-a/20-inset/scene.ts": inset },
  );
