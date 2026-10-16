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
  });
  it("strips BOM and handles CRLF", () => {
    expect(parseFrontmatter("﻿---\r\ntitle: X\r\n---\r\nbody")).toEqual({ data: { title: "X" }, body: "body" });
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
