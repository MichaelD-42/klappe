import { assembleDeck } from "../assemble";

// Calm shout-outs: a short question, a long one with no answer, and a scene with two shout-outs.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Shout calm\nintensity: calm\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-short/scene.md": "## Short\n\n### Who owns the release?\n\nThe team that ships it.\n",
      "sections/10-a/20-long/scene.md":
        "## Long\n\n### What would you stop doing today if nobody asked you to explain why you did it in the first place?\n",
      "sections/10-a/30-two/scene.md":
        "## Two\n\n### Who decides?\n\nThe first answer.\n\n### Who pays?\n\nThe second answer.\n",
    },
    {},
  );
