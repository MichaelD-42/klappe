import { describe, expect, it } from "vitest";
import { MOODS, project, rng, rotate, shade, tint } from "../../src/fx/mesh3d";

describe("project", () => {
  it("divides by depth: x' = x·f/(f+z)", () => {
    expect(project({ x: 100, y: -50, z: 0 }, 300)).toEqual({ x: 100, y: -50, s: 1 });
    const far = project({ x: 100, y: -50, z: 300 }, 300);
    expect(far).toEqual({ x: 50, y: -25, s: 0.5 });
    const near = project({ x: 100, y: 0, z: -100 }, 300);
    expect(near.x).toBeCloseTo(150);
    expect(near.s).toBeCloseTo(1.5);
  });
});

describe("rotate", () => {
  it("keeps the distance to the centre", () => {
    const p = rotate({ x: 1, y: 2, z: 3 }, 0.7, 1.9);
    expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(Math.hypot(1, 2, 3));
  });
  it("a quarter turn about y takes x to -z", () => {
    const p = rotate({ x: 1, y: 0, z: 0 }, Math.PI / 2, 0);
    expect(p.x).toBeCloseTo(0);
    expect(p.z).toBeCloseTo(-1);
  });
});

describe("rng", () => {
  it("gives the same sequence for the same seed and another for another seed", () => {
    const seq = (s: number) => {
      const r = rng(s);
      return Array.from({ length: 20 }, r);
    };
    expect(seq(7)).toEqual(seq(7));
    expect(seq(7)).not.toEqual(seq(8));
    for (const v of seq(3)) expect(v >= 0 && v < 1).toBe(true);
  });
});

describe("MOODS", () => {
  it("holds the storyboard colours and seconds per turn", () => {
    expect(MOODS).toEqual({
      calm: { color: "#009A9B", turn: 24 },
      curious: { color: "#2E86C1", turn: 16 },
      careful: { color: "#E8590C", turn: 32 },
      insight: { color: "#AB9759", turn: 20 },
      celebrating: { color: "#69DB7C", turn: 8 },
    });
  });
});

describe("shade", () => {
  it("fades a dot with depth from full opacity (near) to minAlpha (far)", () => {
    expect(shade(1, 1)).toBe(1);
    expect(shade(1, 0)).toBeCloseTo(0.35);
    expect(shade(1, 0, 0.8)).toBeCloseTo(0.8);
    expect(shade(0.5, 0, 0.8)).toBeCloseTo(0.4);
    expect(shade(1, 0.5, 1)).toBe(1);
  });
});

describe("tint", () => {
  it("keeps the colour at 1, mixes toward white above 1 and toward black below", () => {
    expect(tint("#009A9B", 1)).toEqual([0, 154, 155]);
    expect(tint("#009A9B", 2)).toEqual([255, 255, 255]);
    expect(tint("#009A9B", 1.5)).toEqual([127.5, 204.5, 205]);
    expect(tint("#009A9B", 0.5)).toEqual([0, 77, 77.5]);
    expect(tint("#009A9B", 0)).toEqual([0, 0, 0]);
  });
});
