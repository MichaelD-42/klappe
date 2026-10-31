import { bigType, lowerThird } from "klappe/fx";
import type { Ctx } from "../../types";
import { assembleDeck } from "../assemble";

// A deck with safe-area [100, 200]: a default bigType and a default lowerThird must sit inside that inset.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\nsafe-area: [100, 200]\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-b/scene.md": "## B\n",
    },
    {
      "sections/10-a/10-b/scene.ts": {
        build: (ctx: Ctx) => ({ big: bigType(ctx, { text: "Shipping" }), lt: lowerThird(ctx, { name: "Ada Example", role: "Engineer" }) }),
        steps: [(tl: gsap.core.Timeline, r: { big: ReturnType<typeof bigType>; lt: ReturnType<typeof lowerThird> }) => (r.big.show(tl), r.lt.show(tl))],
      },
    },
  );
