import { assembleDeck } from "../assemble";

// A theme that sets one token; every other token falls back to calm.
export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Theme partial\ntheme: theme-partial\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-first/scene.md": "## First\n\n- One.\n- Two.\n",
      "sections/10-a/20-second/scene.md": "## Second\n\n- Three.\n",
    },
    {},
  );
  r.deck.themes = { "deck:theme-partial": `:root { --k-accent: #ff9f1c; }` };
  return r;
};
