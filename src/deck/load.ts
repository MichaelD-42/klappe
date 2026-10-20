import { assembleDeck, toDeckRelative } from "./assemble";
import { loadFixture } from "./fixtures";

const rekey = <T>(o: Record<string, T>, root?: string) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [toDeckRelative(k, root), v]));
// Keyed like a Markdown link in the deck: "data/x.csv", "media/x.png".
const byLink = (o: Record<string, string>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [/(?:data|media)\/[^/]+$/.exec(k)?.[0] ?? k, v]));

// Keyed deck:<name> | repo:<name> | builtin:<name>; a fixture's own themes win over the built-ins.
function themesOf() {
  const named = (scope: string, o: Record<string, string>) =>
    Object.entries(o).map(([k, v]) => [`${scope}:${/([^/]+)\.css$/.exec(k)![1]}`, v]);
  return Object.fromEntries([
    ...named("builtin", import.meta.glob<string>("../themes/*.css", { query: "?raw", import: "default", eager: true })),
    ...named("repo", import.meta.glob<string>("@themes/*.css", { query: "?raw", import: "default", eager: true })),
    ...named("deck", import.meta.glob<string>("@deck/themes/*.css", { query: "?raw", import: "default", eager: true })),
  ]);
}

// ?inline runs the CSS through Vite, so url() resolves against the deck folder and the assets are bundled.
const deckCss = import.meta.glob<string>("@deck/deck.css", { query: "?inline", import: "default", eager: true });

export function loadDeck() {
  const fixture = loadFixture(new URLSearchParams(location.search).get("fixture"));
  if (fixture) {
    fixture.deck.themes = { ...themesOf(), ...fixture.deck.themes };
    return fixture; // fixtures keep the klappe look, so a deck repo's deck.css cannot break them
  }
  // Appended after the klappe styles, so the deck wins at equal specificity.
  for (const css of Object.values(deckCss)) document.head.append(Object.assign(document.createElement("style"), { textContent: css }));
  const files = import.meta.glob("@deck/**/*.md", { query: "?raw", import: "default", eager: true });
  const modules = import.meta.glob("@deck/sections/**/*.ts", { import: "default", eager: true });
  const data = import.meta.glob<string>("@deck/data/*", { query: "?raw", import: "default", eager: true });
  const media = import.meta.glob<string>("@deck/media/*", { query: "?url", import: "default", eager: true });
  // The shortest key that ends in deck.md is the deck's own; everything before that name is the root.
  const deckMd = Object.keys(files)
    .filter((k) => /(?:^|\/)deck\.md$/.test(k))
    .sort((a, b) => a.length - b.length)[0];
  const root = deckMd?.slice(0, -"deck.md".length);
  const r = assembleDeck(rekey(files as Record<string, string>, root), rekey(modules, root));
  r.deck.themes = themesOf();
  r.deck.files = { data: byLink(data), media: byLink(media) };
  return r;
}
