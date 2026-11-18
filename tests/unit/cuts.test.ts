import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { outline } from "../../bin/outline.mjs";
import { assembleDeck } from "../../src/deck/assemble";
import { buildStepList, cutDeck, layoutDeck } from "../../src/layout";
import { parseFrontmatter, setCut, toDeckMeta } from "../../src/parse/frontmatter";
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
  it("reads cuts as lists or with their own duration, and reports a bad one", () => {
    const { data } = parseFrontmatter("---\ncuts: { short: { sections: [a, c], duration: 20 }, long: [a, b, c] }\n---\n");
    expect(toDeckMeta({ title: "x", ...data }).meta.cuts).toEqual({ short: { sections: ["a", "c"], duration: 20 }, long: { sections: ["a", "b", "c"] } });
    expect(toDeckMeta({ title: "x" }).meta.cuts).toBeUndefined();
    for (const bad of [["a"], { short: "a" }, "short", { short: { sections: "a" } }, { short: { sections: ["a"], duration: -5 } }]) {
      const { meta, problems } = toDeckMeta({ title: "x", cuts: bad });
      expect(meta.cuts).toBeUndefined();
      expect(problems).toContain("deck.md: cuts needs { <name>: [<section id>, …] } or { <name>: { sections: […], skip: [<section>/<scene>, …], duration: <minutes> } }");
    }
  });
  it("reports a cut that keeps no section of the talk", () => {
    for (const cut of ["[]", "[x]"]) {
      const { problems } = assembleDeck({ ...FILES, "deck.md": `---\ntitle: T\ncuts: { qa: ${cut} }\n---\n` }, {});
      expect(problems).toEqual(["deck.md: cut 'qa' keeps no section of the talk, only the appendix"]);
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
  it("keeps the cut's sections and every appendix section", () => {
    expect(cutDeck(deck, "short").deck.sections.map((s) => s.id)).toEqual(["a", "c", "x"]);
  });
  it("plays the sections in the order the cut lists them", () => {
    const back = assembleDeck({ ...FILES, "deck.md": "---\ntitle: T\ncuts: { back: [c, a] }\n---\n" }, {}).deck;
    const layout = layoutDeck(back);
    const cut = cutDeck(back, "back", undefined, layout.canvases);
    expect(cut.deck.sections.map((s) => s.id)).toEqual(["c", "a", "x"]);
    expect(buildStepList(cut.deck, cut.canvases).map((s) => `${s.section}/${s.step}`)).toEqual(["c/1", "a/1", "a/2", "x/1"]);
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

describe("selections, the new name for cuts", () => {
  it("reads selections as cuts, and both keys together", () => {
    const { data } = parseFrontmatter("---\ncuts: { short: [a] }\nselections: { day: { sections: [c, a], skip: [a/a1] } }\n---\n");
    expect(toDeckMeta({ title: "x", ...data }).meta.cuts).toEqual({ short: { sections: ["a"] }, day: { sections: ["c", "a"], skip: ["a/a1"] } });
    expect(toDeckMeta({ title: "x", selections: ["a"] }).problems).toContain(
      "deck.md: selections needs { <name>: [<section id>, …] } or { <name>: { sections: […], skip: [<section>/<scene>, …], duration: <minutes> } }",
    );
  });
  it("reports a name in both keys", () => {
    expect(toDeckMeta({ title: "x", cuts: { day: ["a"] }, selections: { day: ["b"] } }).problems).toContain("deck.md: 'day' is in both cuts and selections; selections wins");
  });
});

describe("cut skip", () => {
  const files = { ...FILES, "sections/10-a/20-a2/scene.md": "## A2\n\n- three\n", "deck.md": "---\ntitle: T\ncuts: { day: { sections: [a, c], skip: [a/a1] } }\n---\n" };
  it("reads skip, the section/scene ids a cut leaves out", () => {
    const { data } = parseFrontmatter(files["deck.md"]);
    expect(toDeckMeta({ title: "x", ...data }).meta.cuts).toEqual({ day: { sections: ["a", "c"], skip: ["a/a1"] } });
    for (const bad of [{ day: { sections: ["a"], skip: "a/a1" } }, { day: { sections: ["a"], skip: ["a1"] } }])
      expect(toDeckMeta({ title: "x", cuts: bad }).meta.cuts).toBeUndefined();
  });
  it("leaves the skipped scenes out of the step list and keeps the whole deck's rects", () => {
    const { deck, problems } = assembleDeck(files, {});
    expect(problems).toEqual([]);
    const layout = layoutDeck(deck);
    const cut = cutDeck(deck, "day", undefined, layout.canvases);
    expect(buildStepList(cut.deck, cut.canvases).map((s) => `${s.scene}/${s.step}`)).toEqual(["a2/1", "c1/1", "x1/1"]);
    expect(cut.canvases[0].rects.a2).toEqual(layout.canvases[0].rects.a2);
  });
  it("reports a skipped scene the deck lacks", () => {
    const { problems } = assembleDeck({ ...files, "deck.md": "---\ntitle: T\ncuts: { day: { sections: [a], skip: [a/nope] } }\n---\n" }, {});
    expect(problems).toEqual(["deck.md: cut 'day' skips no scene 'a/nope'"]);
  });
});

describe("setCut", () => {
  const md = "---\ntitle: T # the talk\ncuts: { short: { sections: [a, c], duration: 20 }, long: [a, b, c] }\nduration: 30\n---\n\nBody.\n";
  const cutsOf = (text: string) => toDeckMeta(parseFrontmatter(text).data).meta.cuts;
  it("adds a cut and keeps the others, the other lines and the body", () => {
    const out = setCut(md, "two-days", { sections: ["c", "a"], skip: ["a/a1"] });
    expect(cutsOf(out)).toEqual({
      short: { sections: ["a", "c"], duration: 20 },
      long: { sections: ["a", "b", "c"] },
      "two-days": { sections: ["c", "a"], skip: ["a/a1"] },
    });
    expect(out.replace(/^cuts:.*$/m, "")).toBe(md.replace(/^cuts:.*$/m, ""));
  });
  it("replaces a cut of the same name and keeps its duration", () => {
    expect(cutsOf(setCut(md, "short", { sections: ["b"], skip: [] }))?.short).toEqual({ sections: ["b"], duration: 20 });
  });
  it("adds a selections line to a deck.md without one", () => {
    const out = setCut("---\ntitle: T\n---\n# x\n", "day", { sections: ["a"], skip: [] });
    expect(out).toBe("---\ntitle: T\nselections: { day: { sections: [a] } }\n---\n# x\n");
  });
  it("writes into selections when the deck has both keys, and leaves the cuts line as it is", () => {
    const both = "---\ntitle: T\ncuts: { old: [a] }\nselections: { new: [b] }\n---\n";
    expect(setCut(both, "day", { sections: ["c"], skip: [] })).toBe("---\ntitle: T\ncuts: { old: [a] }\nselections: { new: { sections: [b] }, day: { sections: [c] } }\n---\n");
  });
});

function deckDir() {
  const dir = mkdtempSync(join(tmpdir(), "cuts-"));
  const files = { ...FILES, "deck.md": "---\ntitle: T\nduration: 5\ncuts: { short: { sections: [a, c], duration: 1 }, plain: [a, c] }\n---\n" };
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
    // A cut without its own duration is judged against the deck's.
    expect((await outline(klappeDir, dir, { cut: "plain" })).text.split("\n")[0]).toBe("# T, cut plain (3 steps, about 1 min; target 5 min, 4 min under)");
    expect((await outline(klappeDir, dir, { cut: "nope" })).problems).toEqual([
      "cut 'nope': deck.md has no such cut (short, plain); playing the whole deck",
    ]);
  });
});
