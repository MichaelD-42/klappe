import { assembleDeck } from "../assemble";
import { scramble, type ScrambleHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// A plain scene to play from, then one line that decodes and a second that wraps onto two lines.
const lines: SceneModule = {
  build: (ctx) => ({
    a: scramble(ctx, { text: "Ship it on Friday", x: 160, y: 300 }),
    b: scramble(ctx, { text: "Every change goes through review before it ships", x: 160, y: 520, w: 1000, size: 56, seed: 2 }),
  }),
  steps: [(tl, r: { a: ScrambleHandle }) => r.a.run(tl), (tl, r: { b: ScrambleHandle }) => r.b.run(tl)],
};

export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# Scramble\n",
      "sections/10-a/05-before/scene.md": "## Before\n\n- Nothing yet.\n",
      "sections/10-a/10-lines/scene.md": "## Lines\n\n- One line.\n- A wrapped line.\n",
    },
    { "sections/10-a/10-lines/scene.ts": lines },
  );
