import { describe, expect, it } from "vitest";
import { assembleDeck } from "../../src/deck/assemble";
import { componentProblems, loadParts, part, partsOf } from "../../src/render/parts";

const deck = (scenes: Record<string, string>, modules: Record<string, unknown> = {}) =>
  assembleDeck(
    {
      "deck.md": "---\ntitle: Parts\n---\n",
      "sections/10-a/section.md": "# A\n",
      ...Object.fromEntries(Object.entries(scenes).map(([id, md]) => [`sections/10-a/${id}/scene.md`, md])),
    },
    modules,
  ).deck;

describe("partsOf", () => {
  it("names only the parts the scene.md files use", () => {
    expect(partsOf(deck({ "10-b": "## B\n\n- One.\n" }), [], [])).toEqual({ names: [], langs: [] });
    const all = deck({
      "10-b": "## B\n\n### Why?\n\nBecause.\n",
      "20-c": "## C\n\n- [ ] Do it.\n",
      "30-d": "## D\n\n- 09:00–10:00 Start\n",
      "40-e": "## E\n\n- Sales [Sales](data/sales.csv)\n",
      "50-f": "## F\n\n```console\n$ ls\n```\n\n- List.\n",
      "60-g": "## G\n\n```chat\nuser: Hi\nHello.\n```\n",
    });
    expect(partsOf(all, [], []).names.sort()).toEqual(["agenda", "chart", "chat", "checklist", "shout", "terminal"]);
    expect(partsOf(all, [], []).langs).toEqual([]);
  });
  it("loads the grammars of the code fences, and of code() when the deck's code imports it", () => {
    const fences = deck({ "10-b": "## B\n\n```ts {1}\nconst a = 1;\n```\n\n- A.\n", "20-c": "## C\n\n```cobol\nX.\n```\n\n- C.\n" });
    expect(partsOf(fences, [], ["python"]).langs).toEqual(["ts"]);
    const plain = deck({ "10-b": "## B\n\n- One.\n" });
    expect(partsOf(plain, ["code"], ["sql", "js", "de"]).langs).toEqual(["js", "sql"]);
    expect(partsOf(plain, ["*"], ["js"]).langs).toEqual(["js"]);
    expect(partsOf(plain, ["icon"], ["js"]).langs).toEqual([]);
  });
  it("skips a scene that builds itself in scene.ts", () => {
    const d = deck({ "10-b": "## B\n\n### Why?\n\nBecause.\n" }, { "sections/10-a/10-b/scene.ts": { build: () => ({}), steps: [] } });
    expect(partsOf(d, [], []).names).toEqual([]);
  });
});

describe("componentProblems", () => {
  it("reports a deck component named like a built-in fence", () => {
    const d = deck({ "10-b": "## B\n\n- One.\n" });
    d.components = { ts: () => [], chat: () => [], stamp: () => [] };
    expect(componentProblems(d)).toEqual([
      "components.ts: 'ts' is a built-in fence; the built-in wins",
      "components.ts: 'chat' is a built-in fence; the built-in wins",
    ]);
  });
});

describe("part", () => {
  it("throws for a part that was not loaded, and returns it once loaded", async () => {
    expect(() => part("chart")).toThrow("chart: not loaded");
    await loadParts(deck({ "10-b": "## B\n\n- Sales [Sales](data/sales.csv)\n" }));
    expect(typeof part("chart")).toBe("function");
  });
});
