import { assembleDeck } from "../assemble";

// Three canvases: the second section enters through a blackout, the third through a cut.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- Before the blackout.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-two/scene.md": "## Two\n\n- After the blackout.\n",
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-three/scene.md": "## Three\n\n- After the cut.\n",
    },
    { "sections/20-b/section.ts": { transition: "blackout" }, "sections/30-c/section.ts": { transition: "cut" } },
  );
