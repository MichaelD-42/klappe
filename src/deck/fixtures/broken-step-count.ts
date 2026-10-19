import { assembleDeck } from "../assemble";

// scene.md has 2 steps, scene.ts has 1 step function.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-b/scene.md": "## B\n\n- Step 1.\n- Step 2.\n",
    },
    { "sections/10-a/10-b/scene.ts": { steps: [() => {}] } },
  );
