import { assembleDeck, toDeckRelative } from "./assemble";

const rekey = <T>(o: Record<string, T>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [toDeckRelative(k), v]));

// Self-test fixture (?fixture=broken-step-count): scene.md has 2 steps, scene.ts has 1 step function.
const brokenStepCount = () =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Fixture\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-b/scene.md": "## B\n\n- One.\n- Two.\n",
    },
    { "sections/10-a/10-b/scene.ts": { steps: [() => {}] } },
  );

export function loadDeck() {
  if (new URLSearchParams(location.search).get("fixture") === "broken-step-count") return brokenStepCount();
  const files = import.meta.glob("@deck/**/*.md", { query: "?raw", import: "default", eager: true });
  const modules = import.meta.glob("@deck/sections/**/*.ts", { import: "default", eager: true });
  return assembleDeck(rekey(files as Record<string, string>), rekey(modules));
}
