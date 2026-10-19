import { describe, expect, it } from "vitest";
import { limbAngle } from "../../src/fx/figure";

describe("limbAngle", () => {
  it("never swings past the swing", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      expect(Math.abs(limbAngle(p, 3))).toBeLessThanOrEqual(25);
      expect(Math.abs(limbAngle(p, 7, 40))).toBeLessThanOrEqual(40);
    }
  });
  it("stands straight at the start and the end of a walk", () => {
    expect(limbAngle(0, 3)).toBeCloseTo(0);
    expect(limbAngle(1, 3)).toBeCloseTo(0);
  });
  it("is sin(progress * steps * 2π) times the swing", () => {
    expect(limbAngle(1 / 8, 2)).toBeCloseTo(25);
    expect(limbAngle(1 / 8, 2, 1)).toBeCloseTo(1);
    expect(limbAngle(3 / 8, 2, 1)).toBeCloseTo(-1);
    expect(limbAngle(0.3, 5, 30)).toBeCloseTo(30 * Math.sin(0.3 * 5 * 2 * Math.PI));
  });
});
