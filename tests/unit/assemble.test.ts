import { describe, it, expect } from "vitest";
import { assembleDeck, toDeckRelative } from "../../src/deck/assemble";

const DECK = "---\ntitle: T\n---";

describe("assembleDeck", () => {
  it("orders by order, then folder name, and attaches modules", () => {
    const mod = { steps: [null] };
    const { deck, problems } = assembleDeck(
      {
        "deck.md": DECK,
        "sections/20-b/section.md": "# B",
        "sections/10-a/section.md": "# A",
        "sections/10-a/20-y/scene.md": "## Y\n\n- y",
        "sections/10-a/10-x/scene.md": "## X\n\n- x",
      },
      { "sections/10-a/10-x/scene.ts": mod },
    );
    expect(problems).toEqual([]);
    expect(deck.meta.title).toBe("T");
    expect(deck.sections.map((s) => s.id)).toEqual(["a", "b"]);
    const scenes = deck.sections[0].scenes;
    expect(scenes.map((s) => s.id)).toEqual(["x", "y"]);
    expect(scenes[0].sectionId).toBe("a");
    expect(scenes[0].module).toBe(mod);
  });
  it("reports a step function count mismatch", () => {
    const r = assembleDeck(
      {
        "deck.md": DECK,
        "sections/10-s/section.md": "# S",
        "sections/10-s/10-a/scene.md": "## A\n\n- x\n- y",
      },
      { "sections/10-s/10-a/scene.ts": { steps: [null] } },
    );
    expect(r.problems).toContain("sections/10-s/10-a/scene.ts: 1 step functions, scene.md has 2 steps");
  });
  it("reports duplicate scene and section ids", () => {
    const r = assembleDeck(
      {
        "deck.md": DECK,
        "sections/10-s/section.md": "# S",
        "sections/10-s/10-a/scene.md": "## A",
        "sections/20-t/section.md": "# T",
        "sections/20-t/10-a/scene.md": "## A",
        "sections/30-s/section.md": "# S2",
      },
      {},
    );
    expect(r.problems.some((p) => p.includes("duplicate scene id 'a'"))).toBe(true);
    expect(r.problems.some((p) => p.includes("duplicate section id 's'"))).toBe(true);
  });
  it("reports a scene folder without scene.md", () => {
    const r = assembleDeck(
      { "deck.md": DECK, "sections/10-s/section.md": "# S" },
      { "sections/10-s/10-a/scene.ts": { steps: [] } },
    );
    expect(r.problems).toContain("sections/10-s/10-a: missing scene.md");
  });
});

describe("toDeckRelative", () => {
  it("cuts glob keys down to the deck-relative path", () => {
    expect(toDeckRelative("/C:/x/decks/demo/deck.md")).toBe("deck.md");
    expect(toDeckRelative("/@fs/C:/x/decks/demo/sections/10-a/section.md")).toBe("sections/10-a/section.md");
    expect(toDeckRelative("@deck/sections/10-a/10-b/scene.ts")).toBe("sections/10-a/10-b/scene.ts");
  });
  it("strips a root and keys in the @deck/ form", () => {
    expect(toDeckRelative("@deck/sections/x/sections/s.md", "@deck/sections/x/")).toBe("sections/s.md");
    expect(toDeckRelative("@deck/sections/x/deck.md", "@deck/sections/x/")).toBe("deck.md");
  });
  it("strips the known deck root, even when the path above it has a sections folder", () => {
    const root = "/C:/work/sections/x/deck/";
    expect(toDeckRelative(root + "deck.md", root)).toBe("deck.md");
    expect(toDeckRelative(root + "sections/10-a/section.md", root)).toBe("sections/10-a/section.md");
    expect(toDeckRelative(root + "sections/10-a/section.md")).toBe("sections/x/deck/sections/10-a/section.md"); // no root: leftmost cut
  });
});
