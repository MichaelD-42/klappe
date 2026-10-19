import { assembleDeck } from "../assemble";

// Two canvases; the second section enters through a blackout.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- Before the blackout.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-two/scene.md": "## Two\n\n- After the blackout.\n",
    },
    { "sections/20-b/section.ts": { transition: "blackout" } },
  );
