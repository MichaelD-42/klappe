import type { Components, OverlayModule } from "../types";
import { assembleDeck, toDeckRelative } from "./assemble";

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

// The test fixtures load only for ?fixture=, so a deck never carries them.
export async function loadDeck() {
  const name = new URLSearchParams(location.search).get("fixture");
  const fixture = name === null ? undefined : await (await import("./fixtures")).loadFixture(name);
  if (fixture) {
    fixture.deck.themes = { ...themesOf(), ...fixture.deck.themes };
    return fixture; // fixtures keep the klappe look, so a deck repo's deck.css cannot break them
  }
  const { deckCss, files, modules, data, media, overlay, components, icons, repoIcons } = await import("./files");
  // Appended after the klappe styles; applyTheme moves it after the theme, so the deck wins at equal specificity.
  for (const css of Object.values(deckCss)) {
    const s = Object.assign(document.createElement("style"), { textContent: css });
    s.dataset.kDeckCss = "";
    document.head.append(s);
  }
  // The shortest key that ends in deck.md is the deck's own; everything before that name is the root.
  const deckMd = Object.keys(files)
    .filter((k) => /(?:^|\/)deck\.md$/.test(k))
    .sort((a, b) => a.length - b.length)[0];
  const root = deckMd?.slice(0, -"deck.md".length);
  const r = assembleDeck(rekey(files as Record<string, string>, root), rekey(modules, root));
  r.deck.themes = themesOf();
  r.deck.files = { data: byLink(data), media: byLink(media) };
  r.deck.overlay = Object.values(overlay)[0] as OverlayModule | undefined;
  r.deck.components = Object.values(components)[0] as Components | undefined;
  r.deck.icons = Object.fromEntries([...Object.entries(repoIcons), ...Object.entries(icons)].map(([k, v]) => [`icons/${k.split("/").pop()}`, v]));
  return r;
}
