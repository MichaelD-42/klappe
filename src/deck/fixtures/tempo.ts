import { assembleDeck } from "../assemble";

// tempo: slow stretches the step fades and the camera flights by 1.4.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Tempo\ntempo: slow\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": "## One\n\n- First.\n- Second.\n",
      "sections/10-a/20-two/scene.md": "## Two\n\n- Third.\n",
    },
    {},
  );
