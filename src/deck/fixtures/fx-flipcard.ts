import { assembleDeck } from "../assemble";
import { flipCard, type FlipCardHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// One card that shows, turns to its back, then to its front again. The back carries a block in --k-accent at
// the card's centre, so a test can tell from pixels alone (a PDF page) which side shows.
const cards: SceneModule = {
  build(ctx) {
    const c = flipCard(ctx, { x: 640, y: 340, front: "The question?", back: "The answer." });
    const back = ctx.html.querySelector("[data-k-flipcard-back]")!;
    const block = back.appendChild(document.createElement("div"));
    Object.assign(block.style, { position: "absolute", left: "270px", top: "150px", width: "100px", height: "100px", background: "var(--k-accent)" });
    return { c };
  },
  steps: [
    (tl, r: { c: FlipCardHandle }) => r.c.show(tl),
    (tl, r: { c: FlipCardHandle }) => r.c.flip(tl),
    (tl, r: { c: FlipCardHandle }) => r.c.flip(tl),
  ],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Flip\n",
      "sections/10-a/10-cards/scene.md": "## Cards\n\n- The front.\n- The back.\n- The front again.\n",
    },
    { "sections/10-a/10-cards/scene.ts": cards },
  );
