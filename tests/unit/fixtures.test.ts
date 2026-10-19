import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { fixtureNames, loadFixture } from "../../src/deck/fixtures";

describe("fixture discovery", () => {
  it("finds one fixture per file in src/deck/fixtures", () => {
    const files = fs.readdirSync(new URL("../../src/deck/fixtures/", import.meta.url)).filter((f) => f.endsWith(".ts"));
    expect([...fixtureNames].sort()).toEqual(files.map((f) => f.slice(0, -3)).sort());
    expect(fixtureNames).toContain("two-scenes");
    expect(fixtureNames).toContain("broken-step-count");
  });
  it("loads a fixture by file name and nothing else", () => {
    expect(loadFixture("two-scenes")?.deck.sections[0].scenes.map((s) => s.id)).toEqual(["first", "second"]);
    expect(loadFixture("no-such-deck")).toBeUndefined();
    expect(loadFixture("toString")).toBeUndefined();
    expect(loadFixture(null)).toBeUndefined();
  });
});
