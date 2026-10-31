import { assembleDeck } from "../assemble";
import { icon, iconTile, type IconHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// The deck's own icons from icons/: one on the 24 grid with paint and a script to strip, one on the wrong grid.
const used: SceneModule = {
  build: (ctx) => ({
    a: icon(ctx, "brand-mark", { x: 600, y: 540, size: 160, color: "var(--k-accent)" }),
    b: iconTile(ctx, "brand-mark", { x: 1300, y: 540, size: 160, tone: "accent" }),
  }),
  steps: [(tl, r: { a: IconHandle; b: IconHandle }) => (r.a.draw(tl), r.b.draw(tl, "<"))],
};

export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Own icons\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-used/scene.md": "## Used\n\n- Two own icons.\n",
    },
    { "sections/10-a/10-used/scene.ts": used },
  );
  r.deck.icons = {
    "icons/brand-mark.svg":
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><title>Mark</title><path d="M4 12h16" fill="#ff0000" style="stroke: blue" class="a"/><circle cx="12" cy="12" r="4" stroke="#00f"/><script>window.ownIconRan = 1</script></svg>',
    "icons/too-big.svg": '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M0 0h100"/></svg>',
  };
  return r;
};
