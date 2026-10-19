import { describe, expect, it } from "vitest";
import { swarmPoint } from "../../src/fx/swarm";

const from = { x: 100, y: 600, w: 300, h: 200 };
const to = { x: 1400, y: 100, w: 200, h: 400 };
const inside = (pt: { x: number; y: number }, r: { x: number; y: number; w: number; h: number }) =>
  pt.x >= r.x - 1e-9 && pt.x <= r.x + r.w + 1e-9 && pt.y >= r.y - 1e-9 && pt.y <= r.y + r.h + 1e-9;

describe("swarmPoint", () => {
  it("is deterministic: the same inputs give the same point", () => {
    for (const p of [0, 0.3, 0.77, 1]) expect(swarmPoint(7, 42, p, from, to)).toEqual(swarmPoint(7, 42, p, from, to));
    expect(swarmPoint(7, 42, 0.5)).toEqual(swarmPoint(7, 42, 0.5));
  });
  it("differs by seed and by index", () => {
    expect(swarmPoint(1, 5, 0.5)).not.toEqual(swarmPoint(2, 5, 0.5));
    expect(swarmPoint(1, 5, 0.5)).not.toEqual(swarmPoint(1, 6, 0.5));
  });
  it("starts in from, ends in to, and stays inside their bounding box", () => {
    const box = {
      x: Math.min(from.x, to.x),
      y: Math.min(from.y, to.y),
      w: Math.max(from.x + from.w, to.x + to.w) - Math.min(from.x, to.x),
      h: Math.max(from.y + from.h, to.y + to.h) - Math.min(from.y, to.y),
    };
    for (let i = 0; i < 2000; i += 7) {
      expect(inside(swarmPoint(3, i, 0, from, to), from)).toBe(true);
      expect(inside(swarmPoint(3, i, 1, from, to), to)).toBe(true);
      for (const p of [0.1, 0.25, 0.5, 0.75, 0.9]) expect(inside(swarmPoint(3, i, p, from, to), box)).toBe(true);
    }
  });
  it("without rects, stays in the unit square", () => {
    for (let i = 0; i < 500; i++)
      for (const p of [0, 0.2, 0.6, 1]) expect(inside(swarmPoint(9, i, p), { x: 0, y: 0, w: 1, h: 1 })).toBe(true);
  });
  it("clamps progress outside 0..1", () => {
    expect(swarmPoint(4, 1, -1, from, to)).toEqual(swarmPoint(4, 1, 0, from, to));
    expect(swarmPoint(4, 1, 2, from, to)).toEqual(swarmPoint(4, 1, 1, from, to));
  });
});
