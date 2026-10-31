import { assembleDeck } from "../assemble";

// A section that sets a light background but keeps calm's light text: a deck problem naming the section.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Section contrast\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-first/scene.md": "## First\n\n- One.\n",
      "sections/20-light/section.md": "# Light\n",
      "sections/20-light/10-second/scene.md": "## Second\n\n- Two.\n",
    },
    { "sections/20-light/section.ts": { tokens: { "--k-bg": "#ffffff" } } },
  );
