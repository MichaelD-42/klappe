import { assembleDeck } from "../assemble";

// The built-in bold theme on a small deck; the walk must stay green with its palette and font.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Theme bold\ntheme: bold\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-first/scene.md": "## First\n\n- One.\n- Two.\n- Three.\n",
      "sections/10-a/20-second/scene.md": "## Second\n\n- Four.\n- Five.\n",
    },
    {},
  );
