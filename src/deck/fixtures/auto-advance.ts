import { assembleDeck } from "../assemble";

// Two canvases, b enters through a crt transition. One press on a/one/1 chains a/one/2 -> b/two/1 -> b/two/2 -> b/two/3.
// b/two/3 has no auto, so the chain stops there; b/two/4 exists so an extra advance would show.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- Title.\n- Cursor.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-two/scene.md": "## Two\n\n- Boot 1.\n- Boot 2.\n- Stop here.\n- After.\n",
    },
    {
      "sections/10-a/10-one/scene.ts": { auto: [null, 0.3] },
      "sections/20-b/section.ts": { transition: "crt" },
      "sections/20-b/10-two/scene.ts": { auto: [0.3, 1.5] },
    },
  );
