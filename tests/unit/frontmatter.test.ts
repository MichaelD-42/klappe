import { describe, it, expect } from "vitest";
import { parseFrontmatter, toDeckMeta } from "../../src/parse/frontmatter";
import { t } from "../../src/strings";

describe("frontmatter", () => {
  it("parses scalars, lists and body", () => {
    const { data, body } = parseFrontmatter(
      "---\ntitle: Demo\nconfidential: true\nshared-canvas: [value-stream, global-team]\n---\nrest",
    );
    expect(data).toEqual({
      title: "Demo",
      confidential: true,
      "shared-canvas": ["value-stream", "global-team"],
    });
    expect(body).toBe("rest");
    expect(toDeckMeta(data).meta.sharedCanvas).toEqual([["value-stream", "global-team"]]);
  });
  it("parses numbers and nested lists", () => {
    expect(
      parseFrontmatter("---\nn: 3\nl: [[a, b], [c]]\n---\n").data,
    ).toEqual({ n: 3, l: [["a", "b"], ["c"]] });
  });
  it("handles no frontmatter", () => {
    expect(parseFrontmatter("no frontmatter")).toEqual({ data: {}, body: "no frontmatter" });
  });
  it("defaults and problems", () => {
    const { meta, problems } = toDeckMeta({});
    expect(problems).toContain("deck.md: missing title");
    expect(meta).toMatchObject({ lang: "en", theme: "calm", intensity: "calm", confidential: false, sharedCanvas: [] });
    expect(toDeckMeta({ title: "x", theme: "bold" }).meta.intensity).toBe("bold");
    expect(toDeckMeta({ title: "x", theme: "house" }).meta).toMatchObject({ theme: "house", intensity: "calm" });
  });
  it("strips BOM and handles CRLF", () => {
    expect(parseFrontmatter("\uFEFF---\r\ntitle: X\r\n---\r\nbody")).toEqual({ data: { title: "X" }, body: "body" });
  });
  it("strips quotes", () => {
    expect(parseFrontmatter('---\ntitle: "My Deck"\n---\n').data).toEqual({ title: "My Deck" });
  });
  it("parses an empty block", () => {
    expect(parseFrontmatter("---\n---\nrest")).toEqual({ data: {}, body: "rest" });
  });
  it("translates", () => {
    expect(t("next", "en")).toBe("Next");
  });
});

describe("frontmatter lists, edge cases", () => {
  it("keeps a comma inside a quoted list item", () => {
    expect(parseFrontmatter('---\ntags: ["a, b", c]\n---\n').data).toEqual({ tags: ["a, b", "c"] });
  });
  it("reads safe-area in CSS order and reports a bad one", () => {
    expect(toDeckMeta({ title: "x" }).meta.safeArea).toBeUndefined();
    expect(toDeckMeta({ title: "x", "safe-area": 40 }).meta.safeArea).toEqual([40, 40, 40, 40]);
    expect(toDeckMeta({ title: "x", "safe-area": [48, 64] }).meta.safeArea).toEqual([48, 64, 48, 64]);
    expect(toDeckMeta({ title: "x", "safe-area": [48, 120, 155] }).meta.safeArea).toEqual([48, 120, 155, 120]);
    expect(toDeckMeta({ title: "x", "safe-area": [1, 2, 3, 4] }).meta.safeArea).toEqual([1, 2, 3, 4]);
    for (const bad of [[1, 2, 3, 4, 5], ["wide"], -1, []]) {
      const { meta, problems } = toDeckMeta({ title: "x", "safe-area": bad });
      expect(meta.safeArea).toBeUndefined();
      expect(problems).toContain("deck.md: safe-area needs 1 to 4 numbers of 0 or more, for example [48, 64]");
    }
  });
  it("reports a shared-canvas list that mixes ids and groups instead of flattening it", () => {
    const { meta, problems } = toDeckMeta({ title: "x", "shared-canvas": ["a", ["b", "c"]] });
    expect(meta.sharedCanvas).toEqual([]);
    expect(problems).toContain("deck.md: shared-canvas mixes ids and lists; use [a, b] or [[a, b], [c, d]]");
  });
});
