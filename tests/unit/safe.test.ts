import { describe, expect, it } from "vitest";
import { safeRect } from "../../src/theme";

describe("safeRect", () => {
  it("defaults to 48 / 64 inside the frame", () => {
    expect(safeRect(undefined, { x: 0, y: 0, w: 1920, h: 1080 })).toEqual({ x: 64, y: 48, w: 1792, h: 984 });
  });
  it("takes top, right, bottom, left", () => {
    expect(safeRect([10, 20, 30, 40], { x: 500, y: 500, w: 1000, h: 800 })).toEqual({ x: 40, y: 10, w: 940, h: 760 });
  });
});
