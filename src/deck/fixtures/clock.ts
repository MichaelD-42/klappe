import { assembleDeck } from "../assemble";

// A one-minute talk: the talk clock counts down from 1:00 once the deck leaves its first step.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Clock\nduration: 1\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-b/scene.md": "## Steps\n\n- One.\n- Two.\n- Three.\n",
    },
    {},
  );
