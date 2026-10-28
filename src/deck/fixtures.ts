import { assembleDeck } from "./assemble";

// In-code decks for content-dependent tests, picked with ?fixture=<name>. Never used without it.
// One deck per file in ./fixtures, named by the file; each default-exports a function that builds it.
type Fixture = () => ReturnType<typeof assembleDeck>;
// Lazy: a page builds one fixture, so it loads that one alone.
const files = import.meta.glob<Fixture>("./fixtures/*.ts", { import: "default" });
const fixtures = new Map(Object.entries(files).map(([k, f]) => [k.slice("./fixtures/".length, -".ts".length), f]));

export const fixtureNames = [...fixtures.keys()];

// An unknown name gives a one-step deck with a problem, so a self-test fails instead of walking another deck.
function unknown(name: string): ReturnType<typeof assembleDeck> {
  const r = assembleDeck(
    {
      "deck.md": "---\ntitle: Unknown fixture\n---\n",
      "sections/10-a/section.md": "# Unknown fixture\n",
      "sections/10-a/10-a/scene.md": "## Unknown fixture\n",
    },
    {},
  );
  r.problems.push(`unknown fixture '${name}'`);
  return r;
}

export const loadFixture = async (name: string | null) =>
  name === null ? undefined : ((await fixtures.get(name)?.())?.() ?? unknown(name));
