import { assembleDeck, toDeckRelative } from "./assemble";
import { loadFixture } from "./fixtures";

const rekey = <T>(o: Record<string, T>, root?: string) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [toDeckRelative(k, root), v]));
// Keyed like a Markdown link in the deck: "data/x.csv", "media/x.png".
const byLink = (o: Record<string, string>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [/(?:data|media)\/[^/]+$/.exec(k)?.[0] ?? k, v]));

export function loadDeck() {
  const fixture = loadFixture(new URLSearchParams(location.search).get("fixture"));
  if (fixture) return fixture;
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
  r.deck.files = { data: byLink(data), media: byLink(media) };
  return r;
}
