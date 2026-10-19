import { describe, expect, it } from "vitest";
import { counterText } from "../../src/fx/motion";

describe("counterText", () => {
  it("equals round(lerp(from, to, p)), with thousands separators", () => {
    for (const [a, b] of [[0, 100], [128, 0], [-5, 5], [0, 2000]])
      for (const p of [0, 0.13, 0.5, 0.501, 0.99, 1])
        expect(counterText(a, b, p)).toBe(Math.round(a + (b - a) * p).toLocaleString("en"));
  });
  it("shows from at the start and to at the end", () => {
    expect(counterText(128, 0, 0)).toBe("128");
    expect(counterText(128, 0, 1)).toBe("0");
    expect(counterText(0, 2000, 1)).toBe("2,000");
  });
});
