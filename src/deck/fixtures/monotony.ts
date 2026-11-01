import { assembleDeck } from "../assemble";

// Three plain text scenes in a row, then three big-number scenes, then a code scene: two monotony warnings.
const text = (t: string) => `## ${t}\n\n- ${t} says one thing.\n`;
const big = (n: number) => `---\nlayout: big-number\n---\n## Big ${n}\n\n- ${n}% of builds.\n`;
export default () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-one/scene.md": text("One"),
      "sections/10-a/20-two/scene.md": text("Two"),
      "sections/10-a/30-three/scene.md": text("Three"),
      "sections/10-a/40-b1/scene.md": big(10),
      "sections/10-a/50-b2/scene.md": big(20),
      "sections/10-a/60-b3/scene.md": big(30),
      "sections/10-a/70-code/scene.md": "## Code\n\n```ts\nconst a = 1;\n```\n\n- One line.\n",
    },
    {},
  );
