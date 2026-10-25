import { assembleDeck } from "../assemble";

// Three canvases: section b pushes in from below, section c opens in an iris from the top left.
// Section a has a second scene next to its first, so a push that left the canvas unclipped would show it.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- Next to two.\n",
      "sections/10-a/20-two/scene.md": "## Two\n\n- Before the push.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-pushed/scene.md": "## Pushed\n\n- After the push.\n",
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-opened/scene.md": "## Opened\n\n- After the iris.\n",
    },
    {
      "sections/20-b/section.ts": { transition: "push", transitionOptions: { direction: "up" } },
      "sections/30-c/section.ts": { transition: "iris", transitionOptions: { origin: [300, 200] } },
    },
  );
