import { describe, expect, it } from "vitest";
import { monotony } from "../../src/selftest";

const s = (id: string, look: string | null) => ({ id, look });

describe("monotony", () => {
  it("warns once per run of three or more scenes in a row with one look", () => {
    expect(monotony([s("a", "text only"), s("b", "text only"), s("c", "text only"), s("d", "text only"), s("e", null)])).toEqual([
      "monotony: 4 scenes in a row are text only: a, b, c, d",
    ]);
    expect(monotony([s("a", "layout big-number"), s("b", "layout big-number"), s("c", "layout big-number")])).toEqual([
      "monotony: 3 scenes in a row are layout big-number: a, b, c",
    ]);
  });

  it("does not warn for two in a row, a broken run, or scenes whose look it cannot tell", () => {
    expect(monotony([s("a", "text only"), s("b", "text only"), s("c", "layout thirds"), s("d", "text only"), s("e", "text only")])).toEqual([]);
    expect(monotony([s("a", null), s("b", null), s("c", null)])).toEqual([]);
  });
});
