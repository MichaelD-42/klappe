import { assembleDeck } from "./assemble";

// In-code decks for content-dependent tests, picked with ?fixture=<name>. Never used without it.
const deck = "---\ntitle: Fixture\n---\n";
const scene = (title: string, n: number) =>
  `## ${title}\n\n${Array.from({ length: n }, (_, i) => `- Step ${i + 1}.`).join("\n")}\n`;

const fixtures: Record<string, () => ReturnType<typeof assembleDeck>> = {
  // scene.md has 2 steps, scene.ts has 1 step function.
  "broken-step-count": () =>
    assembleDeck(
      { "deck.md": deck, "sections/10-a/section.md": "# A\n", "sections/10-a/10-b/scene.md": scene("B", 2) },
      { "sections/10-a/10-b/scene.ts": { steps: [() => {}] } },
    ),
  // One canvas, two scenes side by side: the camera flies from 'first' to 'second'.
  "two-scenes": () =>
    assembleDeck(
      {
        "deck.md": deck,
        "sections/10-a/section.md": "# A\n",
        "sections/10-a/10-first/scene.md": scene("First", 5),
        "sections/10-a/20-second/scene.md": scene("Second", 2),
      },
      {},
    ),
};

export const loadFixture = (name: string | null) =>
  name !== null && Object.hasOwn(fixtures, name) ? fixtures[name]() : undefined;
