import { describe, expect, it } from "vitest";
import { burstPoint } from "../../src/fx/burst";

describe("burstPoint", () => {
  it("is deterministic and differs by seed and index", () => {
    for (const p of [0, 0.3, 0.8, 1]) expect(burstPoint(7, 42, p)).toEqual(burstPoint(7, 42, p));
    expect(burstPoint(1, 5, 0.5)).not.toEqual(burstPoint(2, 5, 0.5));
    expect(burstPoint(1, 5, 0.5)).not.toEqual(burstPoint(1, 6, 0.5));
  });
  it("starts at the origin and stays within one radius on each axis", () => {
    for (let i = 0; i < 500; i++) {
      const s = burstPoint(3, i, 0);
      expect(Math.hypot(s.x, s.y)).toBe(0);
      for (const p of [0.1, 0.4, 0.7, 1]) {
        const b = burstPoint(3, i, p);
        expect(Math.abs(b.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(b.y)).toBeLessThanOrEqual(1);
      }
    }
  });
  it("spreads out: mid-pop the pieces are away from the origin in every direction", () => {
    const pts = Array.from({ length: 150 }, (_, i) => burstPoint(1, i, 0.5));
    expect(pts.some((b) => b.x > 0.3) && pts.some((b) => b.x < -0.3)).toBe(true);
    expect(pts.some((b) => b.y > 0.3) && pts.some((b) => b.y < -0.3)).toBe(true);
  });
  it("clamps progress outside 0..1", () => {
    expect(burstPoint(4, 1, -1)).toEqual(burstPoint(4, 1, 0));
    expect(burstPoint(4, 1, 2)).toEqual(burstPoint(4, 1, 1));
  });
});
