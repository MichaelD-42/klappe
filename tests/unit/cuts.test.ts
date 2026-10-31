import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { outline } from "../../bin/outline.mjs";
import { assembleDeck } from "../../src/deck/assemble";
import { buildStepList, cutDeck, layoutDeck } from "../../src/layout";
import { parseFrontmatter, toDeckMeta } from "../../src/parse/frontmatter";
import { parseSection } from "../../src/parse/section";

const klappeDir = fileURLToPath(new URL("../../", import.meta.url));

// Three sections and an appendix between them in folder order; the cut "short" leaves b out.
const FILES = {
  "deck.md": "---\ntitle: T\ncuts: { short: [a, c], full: [a, b, c] }\n---\n",
  "sections/10-a/section.md": "# A\n",
  "sections/10-a/10-a1/scene.md": "## A1\n\n- one\n- two\n",
  "sections/15-x/section.md": "---\nappendix: true\n---\n# Backup\n",
  "sections/15-x/10-x1/scene.md": "## X1\n\n- backup\n",
  "sections/20-b/section.md": "# B\n",
  "sections/20-b/10-b1/scene.md": "## B1\n\n- b\n",
  "sections/30-c/section.md": "# C\n",
  "sections/30-c/10-c1/scene.md": "## C1\n\n- c\n",
};

describe("deck.md cuts", () => {
  it("parses a flow map of lists", () => {
    expect(parseFrontmatter("---\ncuts: { short: [a, c], long: [a, \"b, c\"] }\n---\n").data).toEqual({
      cuts: { short: ["a", "c"], long: ["a", "b, c"] },
    });
  });
  it("reads cuts and reports a bad one", () => {
    expect(toDeckMeta({ title: "x", cuts: { short: ["a", "c"] } }).meta.cuts).toEqual({ short: ["a", "c"] });
    expect(toDeckMeta({ title: "x" }).meta.cuts).toBeUndefined();
    for (const bad of [["a"], { short: "a" }, "short"]) {
      const { meta, problems } = toDeckMeta({ title: "x", cuts: bad });
      expect(meta.cuts).toBeUndefined();
      expect(problems).toContain("deck.md: cuts needs { <name>: [<section id>, …] }, for example { short: [intro, demo] }");
    }
  });
  it("reports a section id a cut names that the deck lacks", () => {
    const { problems } = assembleDeck({ ...FILES, "deck.md": "---\ntitle: T\ncuts: { short: [a, nope] }\n---\n" }, {});
    expect(problems).toEqual(["deck.md: cut 'short' names no section 'nope'"]);
  });
});

describe("section.md appendix", () => {
  it("reads appendix: true from the frontmatter", () => {
    const { section, problems } = parseSection("---\nappendix: true\n---\n# Backup\n\n> spare\n", "90-backup");
    expect(problems).toEqual([]);
    expect(section).toEqual({ id: "backup", order: 90, title: "Backup", notes: "spare", appendix: true });
  });
});

describe("cutDeck", () => {
  const { deck, problems } = assembleDeck(FILES, {});
  it("assembles the fixture cleanly", () => expect(problems).toEqual([]));
  it("without a cut keeps every section, the appendix last", () => {
    const r = cutDeck(deck, null);
    expect(r.problems).toEqual([]);
    expect(r.deck.sections.map((s) => s.id)).toEqual(["a", "b", "c", "x"]);
  });
  it("keeps the cut's sections in deck order and every appendix section", () => {
    expect(cutDeck(deck, "short").deck.sections.map((s) => s.id)).toEqual(["a", "c", "x"]);
  });
  it("reports an unknown cut and plays the whole deck", () => {
    const r = cutDeck(deck, "tiny");
    expect(r.problems).toEqual(["cut 'tiny': deck.md has no such cut (short, full); playing the whole deck"]);
    expect(r.deck.sections.map((s) => s.id)).toEqual(["a", "b", "c", "x"]);
  });
  it("reports a deep link into a section the cut leaves out", () => {
    expect(cutDeck(deck, "short", "b").problems).toEqual(["#/b: the cut 'short' leaves section 'b' out; showing the cut's first step"]);
    expect(cutDeck(deck, "short", "c").problems).toEqual([]);
    expect(cutDeck(deck, "short", "unknown").problems).toEqual([]);
  });
  it("gives a step list with the appendix last and marked, on the whole deck's canvases", () => {
    const layout = layoutDeck(deck);
    const cut = cutDeck(deck, "short", undefined, layout.canvases);
    expect(cut.canvases.map((c) => c.id)).toEqual(["a", "x", "c"]);
    const steps = buildStepList(cut.deck, cut.canvases);
    expect(steps.map((s) => `${s.section}/${s.step}${s.appendix ? "*" : ""}@${s.canvas}`)).toEqual(["a/1@0", "a/2@0", "c/1@2", "x/1*@1"]);
  });
  it("keeps a shared canvas laid out as in the whole deck when a section in the middle is cut", () => {
    const shared = assembleDeck({ ...FILES, "deck.md": "---\ntitle: T\nshared-canvas: [a, b, c]\ncuts: { short: [a, c] }\n---\n" }, {}).deck;
    const layout = layoutDeck(shared);
    const cut = cutDeck(shared, "short", undefined, layout.canvases);
    expect(cut.canvases.map((c) => c.sectionIds)).toEqual([["a", "c"], ["x"]]);
    expect(cut.canvases[0].rects.c1).toEqual(layout.canvases[0].rects.c1);
  });
});

function deckDir() {
  const dir = mkdtempSync(join(tmpdir(), "cuts-"));
  const files = { ...FILES, "deck.md": "---\ntitle: T\nduration: 1\ncuts: { short: [a, c] }\n---\n" };
  for (const [f, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true });
    writeFileSync(join(dir, f), text);
  }
  return dir;
}

describe("outline --cut", () => {
  it("lists the cut's sections, the appendix last and marked, and estimates the main flow alone", async () => {
    const dir = deckDir();
    const { text, problems } = await outline(klappeDir, dir, { cut: "short" });
    expect(problems).toEqual([]);
    const heads = text.split("\n").filter((l: string) => l.startsWith("#"));
    expect(heads[0]).toBe("# T, cut short (3 steps, about 1 min; target 1 min, on target)");
    expect(heads.filter((l: string) => l.startsWith("## "))).toEqual([
      "## a: A (2 steps, about 1 min)",
      "## c: C (1 steps, about 1 min)",
      "## x: Backup (appendix, 1 steps, about 1 min)",
    ]);
    expect((await outline(klappeDir, dir, { cut: "nope" })).problems).toEqual([
      "cut 'nope': deck.md has no such cut (short); playing the whole deck",
    ]);
  });
});
