import { assembleDeck } from "../assemble";

// Sections a and c share one canvas, with b (another canvas) between them. c is entered by zoom, so the
// zoom runs on a canvas whose first step of c also flies the camera from a's scene to c's.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\nshared-canvas: [a, c]\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- On the shared canvas.\n- Still here.\n",
      "sections/20-b/section.md": "# B\n",
      "sections/20-b/10-two/scene.md": "## Two\n\n- On its own canvas.\n",
      "sections/30-c/section.md": "# C\n",
      "sections/30-c/10-three/scene.md": "## Three\n\n- Back on the shared canvas, one scene on.\n- And on.\n",
    },
    { "sections/30-c/section.ts": { transition: "zoom" } },
  );
