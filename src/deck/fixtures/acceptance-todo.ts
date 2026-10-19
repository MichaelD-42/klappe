import { assembleDeck } from "../assemble";

// AC-10 and AC-11 (ruling R16: the demo deck walks clean, so the missing files live here).
// A scene that links a CSV file and an image the deck lacks: each shows its placeholder and records a problem.
// The acceptance test writes these files to a temp deck and runs writeTodos (bin/todo.mjs) on them.
export const files = {
  "deck.md": "---\ntitle: Fixture\n---\n",
  "sections/10-a/section.md": "# A\n",
  "sections/10-a/10-missing/scene.md": [
    "## Missing files",
    "",
    "- A plain step.",
    "- [Sales by region](data/missing.csv)",
    '- ![An engine](media/missing.png "A cutaway drawing of an engine")',
    "",
  ].join("\n"),
};

export default () => {
  const r = assembleDeck(files, {});
  r.deck.files = { data: {}, media: {} };
  return r;
};
