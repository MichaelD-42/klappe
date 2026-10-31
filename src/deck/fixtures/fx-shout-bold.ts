import { assembleDeck } from "../assemble";
import { shout, type ShoutHandle } from "klappe/fx";
import type { SceneModule } from "../../types";

// The pause beat, from scene.ts only: enter, fade (bold keeps a trace of the question), answer.
const paused: SceneModule = {
  build: (ctx) => shout(ctx, { question: "Who signs off?", answer: "Nobody, yet." }),
  steps: [(tl, h: ShoutHandle) => h.enter(tl), (tl, h: ShoutHandle) => h.fade(tl), (tl, h: ShoutHandle) => h.answer(tl)],
};

// Bold shout-outs: a short question, a long one with no answer, a scene with two shout-outs, and one with the pause beat.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Shout bold\nintensity: bold\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-short/scene.md": "## Short\n\n### Who owns the release?\n\nThe team that ships it.\n",
      "sections/10-a/20-long/scene.md":
        "## Long\n\n### What would you stop doing today if nobody asked you to explain why you did it in the first place?\n",
      "sections/10-a/30-two/scene.md":
        "## Two\n\n### Who decides?\n\nThe first answer.\n\n### Who pays?\n\nThe second answer.\n",
      "sections/10-a/40-paused/scene.md": "## Paused\n\n- The question.\n- A pause.\n- The answer.\n",
    },
    { "sections/10-a/40-paused/scene.ts": paused },
  );
