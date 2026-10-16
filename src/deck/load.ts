import { assembleDeck, toDeckRelative } from "./assemble";
import { loadFixture } from "./fixtures";

const rekey = <T>(o: Record<string, T>) =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [toDeckRelative(k), v]));

export function loadDeck() {
  const fixture = loadFixture(new URLSearchParams(location.search).get("fixture"));
  if (fixture) return fixture;
  const files = import.meta.glob("@deck/**/*.md", { query: "?raw", import: "default", eager: true });
  const modules = import.meta.glob("@deck/sections/**/*.ts", { import: "default", eager: true });
  return assembleDeck(rekey(files as Record<string, string>), rekey(modules));
}
