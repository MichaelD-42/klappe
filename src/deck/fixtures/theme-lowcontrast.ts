import { assembleDeck } from "../assemble";

// A theme whose text colour fails contrast on calm's background.
export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Theme lowcontrast\ntheme: theme-lowcontrast\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-first/scene.md": "## First\n\n- One.\n- Two.\n",
      "sections/10-a/20-second/scene.md": "## Second\n\n- Three.\n",
    },
    {},
  );
  r.deck.themes = { "deck:theme-lowcontrast": `:root { --k-fg: #3a4a60; }` };
  return r;
};
