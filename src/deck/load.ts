import { assembleDeck, toDeckRelative } from "./assemble";
import { loadFixture } from "./fixtures";

const rekey = <T>(o: Record<string, T>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [toDeckRelative(k), v]));
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
  const r = assembleDeck(rekey(files as Record<string, string>), rekey(modules));
  r.deck.files = { data: byLink(data), media: byLink(media) };
  return r;
}
