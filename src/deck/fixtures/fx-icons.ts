import { assembleDeck } from "../assemble";
import type { gsap } from "gsap";
import { icon, iconTile, type IconHandle } from "../../fx";
import type { SceneModule } from "../../types";

const NAMES = ["lightbulb", "cpu", "shield-check", "grid-2x2", "rocket"];

// A row of icons: draw on, then light up. Sizes and colours vary; every closed shape takes the tint.
const plain: SceneModule = {
  build: (ctx) => [
    icon(ctx, NAMES[0], { x: 360, y: 540, color: "var(--k-fg)" }),
    icon(ctx, NAMES[1], { x: 660, y: 540, size: 160, color: "var(--k-accent)" }),
    icon(ctx, NAMES[2], { x: 960, y: 540, size: 240, color: "var(--k-phosphor)" }),
    icon(ctx, NAMES[3], { x: 1260, y: 540, size: 160, color: "var(--k-phosphor-amber)" }),
    icon(ctx, NAMES[4], { x: 1560, y: 540, size: 64, color: "var(--k-fg)" }),
  ],
  steps: [(tl, icons) => row(tl, icons, "draw"), (tl, icons) => row(tl, icons, "light")],
};

// The whole row at once: each icon after the first starts with the one before ("<").
const row = (tl: gsap.core.Timeline, items: IconHandle[], what: "draw" | "light") =>
  items.forEach((i, n) => i[what](tl, n ? "<" : undefined));

// Tiles in each tone form: a bare token name and a full custom property.
// "info" has a zero-length "h.01" dot stroke, which fades in at its slot.
const tiles: SceneModule = {
  build: (ctx) => [
    iconTile(ctx, NAMES[0], { x: 300, y: 540, tone: "accent" }),
    iconTile(ctx, NAMES[1], { x: 600, y: 540, size: 160, tone: "--k-phosphor" }),
    iconTile(ctx, NAMES[2], { x: 960, y: 540, size: 240, tone: "phosphor-amber" }),
    iconTile(ctx, NAMES[3], { x: 1320, y: 540, size: 160, tone: "--k-accent" }),
    iconTile(ctx, "info", { x: 1620, y: 540, tone: "phosphor" }),
  ],
  steps: [(tl, t) => row(tl, t, "draw"), (tl, t) => row(tl, t, "light")],
};

const md = (title: string) => `## ${title}\n\n- Draw.\n- Light.\n`;

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-icons/scene.md": md("Icons"),
      "sections/10-a/20-tiles/scene.md": md("Tiles"),
    },
    { "sections/10-a/10-icons/scene.ts": plain, "sections/10-a/20-tiles/scene.ts": tiles },
  );
