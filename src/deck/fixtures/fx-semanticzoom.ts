import { assembleDeck } from "../assemble";
import { semanticZoom, type SemanticZoomHandle, type ZoomBox } from "klappe/fx";
import type { SceneModule } from "../../types";

// Two levels in and back out, then the three problems: into a box with nothing inside, a level skipped, out at the top.
const boxes: ZoomBox[] = [
  { label: "Shop", children: [{ label: "Web" }, { label: "API", children: [{ label: "Orders" }, { label: "Payments" }, { label: "Stock" }] }, { label: "DB" }] },
  { label: "Billing" },
  { label: "Support" },
];
const rect = { x: 160, y: 120, w: 1600, h: 760 };
type R = { z: SemanticZoomHandle };

const dive: SceneModule = {
  build: (ctx) => ({ z: semanticZoom(ctx, { boxes, ...rect }) }),
  steps: [
    (tl, r: R) => r.z.show(tl),
    (tl, r: R) => r.z.into(["Shop"])(tl),
    (tl, r: R) => r.z.into(["Shop", "API"])(tl),
    (tl, r: R) => r.z.out(tl),
    (tl, r: R) => r.z.out(tl),
  ],
};
const wrong: SceneModule = {
  build: (ctx) => ({ z: semanticZoom(ctx, { boxes, ...rect }) }),
  steps: [(tl, r: R) => (r.z.show(tl), r.z.into(["Billing"])(tl), r.z.into(["Shop", "API"])(tl), r.z.out(tl))],
};

// links: arrows between boxes of one level, shown with the level and gone when the camera leaves it.
const links: SceneModule = {
  build: (ctx) => ({
    z: semanticZoom(ctx, {
      boxes,
      ...rect,
      links: [
        { from: ["Shop"], to: ["Billing"] },
        { from: ["Billing"], to: ["Support"] },
        { from: ["Shop", "Web"], to: ["Shop", "API"] },
        { from: ["Shop", "API"], to: ["Shop", "DB"] },
        { from: ["Shop", "API", "Orders"], to: ["Shop", "API", "Payments"] },
      ],
    }),
  }),
  steps: [(tl, r: R) => r.z.show(tl), (tl, r: R) => r.z.into(["Shop"])(tl), (tl, r: R) => r.z.into(["Shop", "API"])(tl), (tl, r: R) => r.z.out(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Zoom\n",
      "sections/10-a/10-dive/scene.md": "## Dive\n\n- The boxes.\n- Into Shop.\n- Into API.\n- Out.\n- Out again.\n",
      "sections/10-a/20-wrong/scene.md": "## Wrong\n\n- Three wrong moves.\n",
      "sections/10-a/30-links/scene.md": "## Links\n\n- The boxes.\n- Into Shop.\n- Into API.\n- Out.\n",
    },
    { "sections/10-a/10-dive/scene.ts": dive, "sections/10-a/20-wrong/scene.ts": wrong, "sections/10-a/30-links/scene.ts": links },
  );
