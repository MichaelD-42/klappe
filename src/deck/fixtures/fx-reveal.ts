import { assembleDeck } from "../assemble";
import { reveal, type RevealHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// A plain scene to play from, then three source lines that rise in and a sentence that rises word by word
// after a 0.3 s hold.
const text: SceneModule = {
  build: (ctx) => ({
    a: reveal(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 200 }),
    b: reveal(ctx, { text: ctx.doc!.steps[1].text, x: 160, y: 600, w: 1000, size: 48, by: "word", delay: 0.3 }),
  }),
  steps: [(tl, r: { a: RevealHandle }) => r.a.run(tl), (tl, r: { b: RevealHandle }) => r.b.run(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Reveal\n",
      "sections/10-a/05-before/scene.md": "## Before\n\n- Nothing yet.\n",
      "sections/10-a/10-text/scene.md":
        "## Text\n\n- We ship small.\n  We ship often.\n  We ship together.\n- Every change goes through review before it ships.\n",
    },
    { "sections/10-a/10-text/scene.ts": text },
  );
