import { assembleDeck } from "../assemble";

const scene = (title: string, n: number) =>
  `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.`).join("\n")}\n`;

// One canvas, two scenes side by side: the camera flies from 'first' to 'second'.
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-first/scene.md": scene("First", 5),
      "sections/10-a/20-second/scene.md": scene("Second", 2),
    },
    {},
  );
