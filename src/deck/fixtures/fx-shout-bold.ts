import { assembleDeck } from "../assemble";

// Bold shout-outs: a short question, and a long one with no answer.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Shout bold\nintensity: bold\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-short/scene.md": "## Short\n\n### Who owns the release?\n\nThe team that ships it.\n",
      "sections/10-a/20-long/scene.md":
        "## Long\n\n### What would you stop doing today if nobody asked you to explain why you did it in the first place?\n",
    },
    {},
  );
