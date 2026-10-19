import { describe, expect, it } from "vitest";
import { shatterGeometry } from "../../src/fx/shatter";

type Pt = { x: number; y: number };
// Even-odd ray cast.
function inside(p: Pt, P: Pt[]): boolean {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [a, b] = [P[i], P[j]];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) c = !c;
  }
  return c;
}

const cases = [
  { name: "spike default", w: 1920, h: 1080, impact: { x: 1240, y: 430 }, shards: 30, seed: 1986 },
  { name: "few shards, corner impact", w: 1920, h: 1080, impact: { x: 200, y: 900 }, shards: 12, seed: 7 },
  { name: "many shards, small box", w: 800, h: 500, impact: { x: 400, y: 250 }, shards: 60, seed: 3 },
  { name: "five shards, centre impact", w: 1920, h: 1080, impact: { x: 960, y: 540 }, shards: 5, seed: 1 },
  { name: "impact outside the box", w: 1000, h: 600, impact: { x: -100, y: 300 }, shards: 20, seed: 11 },
];

describe("shatterGeometry", () => {
  for (const c of cases) {
    const g = shatterGeometry(c.w, c.h, c.impact, c.shards, c.seed);

    it(`${c.name}: every point lies in exactly one shard`, () => {
      const bad: string[] = [];
      for (let x = 3.7; x < c.w; x += 23.3)
        for (let y = 2.9; y < c.h; y += 21.1) {
          const n = g.cells.filter((P) => inside({ x, y }, P)).length;
          if (n !== 1) bad.push(`${x.toFixed(1)},${y.toFixed(1)}: ${n}`);
        }
      expect(bad.slice(0, 10)).toEqual([]);
    });

    it(`${c.name}: the shard count is within 20 % of the option`, () => {
      expect(Math.abs(g.cells.length - c.shards)).toBeLessThanOrEqual(c.shards * 0.2);
    });
  }

  it("the same seed gives the same polygons, another seed other ones", () => {
    const a = shatterGeometry(1920, 1080, { x: 1240, y: 430 }, 30, 42);
    expect(shatterGeometry(1920, 1080, { x: 1240, y: 430 }, 30, 42)).toEqual(a);
    expect(shatterGeometry(1920, 1080, { x: 1240, y: 430 }, 30, 43).cells).not.toEqual(a.cells);
  });
});
