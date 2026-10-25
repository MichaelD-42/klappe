import { assembleDeck } from "../assemble";
import { reveal, type RevealHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// A plain scene to play from, then three source lines that rise in and a sentence that rises word by word
// after a 0.3 s hold; then a sentence with key words.
const text: SceneModule = {
  build: (ctx) => ({
    a: reveal(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 200 }),
    b: reveal(ctx, { text: ctx.doc!.steps[1].text, x: 160, y: 600, w: 1000, size: 48, by: "word", delay: 0.3 }),
  }),
  steps: [(tl, r: { a: RevealHandle }) => r.a.run(tl), (tl, r: { b: RevealHandle }) => r.b.run(tl)],
};
// A sentence with **bold** key words, one a two-word phrase: they grow and take --k-accent as they rise.
const stress: SceneModule = {
  build: (ctx) => reveal(ctx, { text: ctx.doc!.steps[0].text, x: 160, y: 300, w: 1500, size: 64, by: "word" }),
  steps: [(tl, r: RevealHandle) => r.run(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Reveal\n",
      "sections/10-a/05-before/scene.md": "## Before\n\n- Nothing yet.\n",
      "sections/10-a/10-text/scene.md":
        "## Text\n\n- We ship small.\n  We ship often.\n  We ship together.\n- Every change goes through review before it ships.\n",
      "sections/10-a/20-stress/scene.md": "## Stress\n\n- We ship **small** and **very often**.\n",
    },
    { "sections/10-a/10-text/scene.ts": text, "sections/10-a/20-stress/scene.ts": stress },
  );
