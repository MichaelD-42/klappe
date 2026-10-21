import { assembleDeck } from "../assemble";

// A theme colour in oklch(): the browser serialises it outside sRGB, so it cannot be measured.
export default () => {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Theme oklch\ntheme: theme-oklch\n---\n",
      "sections/10-a/section.md": "# A\n",
      "sections/10-a/10-first/scene.md": "## First\n\n- One.\n",
    },
    {},
  );
  r.deck.themes = { "deck:theme-oklch": ":root { --k-fg: oklch(0.95 0.02 250); }" };
  return r;
};
