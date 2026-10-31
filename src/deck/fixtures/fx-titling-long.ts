import { endRoll } from "klappe/fx";
import type { Ctx } from "../../types";
import { assembleDeck } from "../assemble";

// An end roll with more sources than its rect holds: with reduced motion they all must still show.
export default () =>
  assembleDeck(
    { "deck.md": "---\ntitle: Fixture\n---\n", "sections/10-a/section.md": "# A\n", "sections/10-a/10-roll/scene.md": "## Roll\n" },
    {
      "sections/10-a/10-roll/scene.ts": {
        build: (ctx: Ctx) => {
          ctx.deck.sources.push(...Array.from({ length: 40 }, (_, i) => `Statistics office, table ${i + 1}`));
          return endRoll(ctx, { title: "Sources", thanks: ["Thanks"] });
        },
        steps: [(tl: gsap.core.Timeline, e: ReturnType<typeof endRoll>) => e.show(tl)],
      },
    },
  );
