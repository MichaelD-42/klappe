import { icon, iconTile } from "klappe/fx";
import { captioned } from "../../../caption";
import { row } from "../section";

// decks/demo/icons/release-gate.svg, by its file name, beside a Lucide icon in the same style.
export default captioned('icon(ctx, "release-gate") — the deck\'s own icons/release-gate.svg, on Lucide\'s 24 grid', {
  build: (ctx) => [
    icon(ctx, "release-gate", { x: 640, y: 500, size: 200, color: "var(--k-accent)" }),
    iconTile(ctx, "release-gate", { x: 960, y: 500, size: 200, tone: "ok" }),
    icon(ctx, "shield-check", { x: 1280, y: 500, size: 200, color: "var(--k-fg)" }),
  ],
  steps: [(tl, t) => row(tl, t, "draw")],
});
