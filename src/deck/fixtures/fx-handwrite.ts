import { assembleDeck } from "../assemble";
import { handwrite, type HandwriteHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// A plain scene to play from, then two phrases that write themselves, one per step.
const notes: SceneModule = {
  build: (ctx) => ({
    a: handwrite(ctx, { text: "Ship it on Friday", x: 160, y: 300 }),
    b: handwrite(ctx, { text: "and celebrate!", x: 160, y: 520, size: 72, color: "--k-accent", seed: 2 }),
  }),
  steps: [(tl, r: { a: HandwriteHandle }) => r.a.write(tl), (tl, r: { b: HandwriteHandle }) => r.b.write(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Handwrite\n",
      "sections/10-a/05-before/scene.md": "## Before\n\n- Nothing yet.\n",
      "sections/10-a/10-notes/scene.md": "## Notes\n\n- One phrase.\n- A second phrase.\n",
    },
    { "sections/10-a/10-notes/scene.ts": notes },
  );
