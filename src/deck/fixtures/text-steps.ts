import { assembleDeck } from "../assemble";

// Plain text steps: 'say' replaces each one with the next (the default), 'stack' keeps them (stack: true).
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-say/scene.md": "## Say\n\n- One.\n- Two.\n- Three.\n",
      "sections/10-a/20-stack/scene.md": "---\nstack: true\n---\n## Stack\n\n- One.\n- Two.\n",
    },
    {},
  );
