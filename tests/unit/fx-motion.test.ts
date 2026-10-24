import { describe, expect, it } from "vitest";
import { bubbleLayout, counterText } from "../../src/fx/motion";

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

describe("bubbleLayout", () => {
  it("keeps today's horizontal sides: the bubble sits on that side, the tail on the facing edge", () => {
    expect(bubbleLayout("right")).toMatchObject({ dx: 24, dy: 0, xPercent: 0, yPercent: -50, edge: "left" });
    expect(bubbleLayout("left")).toMatchObject({ dx: -24, dy: 0, xPercent: -100, yPercent: -50, edge: "right" });
  });
  it("side top puts the tail on the top edge, so the bubble sits below the point", () => {
    expect(bubbleLayout("top")).toMatchObject({ dx: 0, dy: 24, xPercent: -50, yPercent: 0, edge: "top" });
    expect(bubbleLayout("bottom")).toMatchObject({ dx: 0, dy: -24, xPercent: -50, yPercent: -100, edge: "bottom" });
  });
});
