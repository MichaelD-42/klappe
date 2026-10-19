import { describe, expect, test } from "vitest";
import { arcPath, fitProjection } from "../../src/fx/map";

const rect = { x: 120, y: 80, w: 1200, h: 700 };
const known: [number, number][] = [
  [0, 0],
  [10, 50],
  [-95, 40],
  [105, 35],
  [-55, -12],
  [179, -80],
];

describe("fitProjection", () => {
  test("known coordinates land inside rect", () => {
    const p = fitProjection(rect);
    for (const c of known) {
      const [x, y] = p(c)!;
      expect(x).toBeGreaterThanOrEqual(rect.x);
      expect(x).toBeLessThanOrEqual(rect.x + rect.w);
      expect(y).toBeGreaterThanOrEqual(rect.y);
      expect(y).toBeLessThanOrEqual(rect.y + rect.h);
    }
  });

  test("north is up and east is right", () => {
    const p = fitProjection(rect);
    expect(p([0, 50])![1]).toBeLessThan(p([0, -50])![1]);
    expect(p([50, 0])![0]).toBeGreaterThan(p([-50, 0])![0]);
  });
});

describe("arcPath", () => {
  const nums = (d: string) => d.match(/-?\d*\.?\d+(?:e-?\d+)?/g)!.map(Number);
  test("each arc starts at its from-site and ends at its to-site", () => {
    const p = fitProjection(rect);
    for (const a of known)
      for (const b of known) {
        if (a === b) continue;
        const [from, to] = [p(a)!, p(b)!];
        const n = nums(arcPath(from, to));
        expect(n[0]).toBeCloseTo(from[0], 6);
        expect(n[1]).toBeCloseTo(from[1], 6);
        expect(n.at(-2)).toBeCloseTo(to[0], 6);
        expect(n.at(-1)).toBeCloseTo(to[1], 6);
      }
  });

  test("the arc bows upward", () => {
    const n = nums(arcPath([0, 100], [200, 100]));
    expect(n[3]).toBeLessThan(100); // control point y
  });
});
