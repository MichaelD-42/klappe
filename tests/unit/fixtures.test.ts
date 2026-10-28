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
  it("loads a fixture by file name and nothing else", async () => {
    expect((await loadFixture("two-scenes"))?.deck.sections[0].scenes.map((s) => s.id)).toEqual(["first", "second"]);
    for (const name of ["no-such-deck", "toString"]) {
      const r = await loadFixture(name);
      expect(r?.problems).toEqual([`unknown fixture '${name}'`]);
      expect(r?.deck.meta.title).toBe("Unknown fixture");
    }
    expect(await loadFixture(null)).toBeUndefined();
  });
});
