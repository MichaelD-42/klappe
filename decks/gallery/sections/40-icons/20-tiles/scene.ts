import { iconTile } from "klappe/fx";
import { captioned } from "../../../caption";
import { row } from "../section";

// Each tone form: a bare token name and a full custom property.
export default captioned('iconTile(ctx, name, { tone: "accent" }) — an icon on a tile, in a theme colour', {
  build: (ctx) => [
    iconTile(ctx, "lightbulb", { x: 300, y: 500, tone: "accent" }),
    iconTile(ctx, "cpu", { x: 600, y: 500, size: 160, tone: "--k-phosphor" }),
    iconTile(ctx, "shield-check", { x: 960, y: 500, size: 240, tone: "phosphor-amber" }),
    iconTile(ctx, "grid-2x2", { x: 1320, y: 500, size: 160, tone: "--k-accent" }),
    iconTile(ctx, "info", { x: 1620, y: 500, tone: "phosphor" }),
  ],
  steps: [(tl, t) => row(tl, t, "draw"), (tl, t) => row(tl, t, "light")],
});
