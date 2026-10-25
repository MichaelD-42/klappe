import { describe, expect, it } from "vitest";
import { glitchFrame, transitionGlitch } from "../../src/fx/glitch";
import { pagePeel, transitionCube } from "../../src/fx/turn";
import type { CanvasRuntime } from "../../src/render/world";

// Plain objects stand in for the canvas elements and the layers above them; gsap tweens their properties directly.
const canvases = () => {
  const stage = {};
  const worlds = { parentElement: stage };
  const mk = () => ({ el: { autoAlpha: 1, style: {}, parentElement: worlds } }) as unknown as CanvasRuntime;
  return [mk(), mk()] as const;
};
const shown = (c: CanvasRuntime) => (c.el as any).autoAlpha;

describe("glitchFrame", () => {
  it("is a pure function of progress and seed", () => {
    expect(glitchFrame(0.37, 5)).toEqual(glitchFrame(0.37, 5));
    expect(glitchFrame(0.37, 5)).not.toEqual(glitchFrame(0.37, 6));
  });
  it("tiles the frame with bands, old at the start and new at the end", () => {
    for (const p of [0, 0.5, 0.99]) {
      const { bands } = glitchFrame(p, 2);
      expect(bands[0].y).toBe(0);
      expect(bands.reduce((s, b) => s + b.h, 0)).toBe(1080);
      bands.forEach((b, i) => i && expect(b.y).toBe(bands[i - 1].y + bands[i - 1].h));
    }
    expect(glitchFrame(0, 2).bands.every((b) => !b.fresh)).toBe(true);
    expect(glitchFrame(0.99, 2).bands.every((b) => b.fresh)).toBe(true);
    for (let p = 0.1; p < 0.9; p += 0.08) {
      const kinds = new Set(glitchFrame(p, 2).bands.map((b) => b.fresh));
      expect(kinds.size, `at ${p}`).toBe(2);
    }
  });
});

const area = (P: [number, number][]) => Math.abs(P.reduce((a, [x, y], i) => { const [u, v] = P[(i + 1) % P.length]; return a + x * v - u * y; }, 0) / 2);

describe("pagePeel", () => {
  it("starts flat, ends peeled, and the flap is as large as the part peeled off", () => {
    expect(area(pagePeel(0).page)).toBeCloseTo(1920 * 1080);
    expect(area(pagePeel(0).flap)).toBeCloseTo(0);
    expect(area(pagePeel(1).page)).toBeCloseTo(0);
    for (const p of [0.2, 0.5, 0.8]) {
      const { page, flap } = pagePeel(p);
      expect(area(page) + area(flap), `at ${p}`).toBeCloseTo(1920 * 1080);
    }
  });
});

// The page turn makes its flap in the DOM, so the e2e test covers it.
describe("glitch and cube", () => {
  for (const [name, fn, length] of [
    ["glitch", transitionGlitch, 0.5],
    ["cube", transitionCube, 1],
  ] as const)
    it(`${name} ends with the old canvas hidden and the new one shown, in ${length} s`, () => {
      const [from, to] = canvases();
      const tl = fn(from, to, {}).pause();
      expect(tl.duration()).toBeCloseTo(length);
      tl.progress(1);
      expect([shown(from), shown(to)]).toEqual([0, 1]);
    });
  it("cube starts the new section's first step at the reveal label, before it ends", () => {
    const tl = transitionCube(...canvases(), {});
    expect(tl.labels.reveal).toBeGreaterThan(0);
    expect(tl.labels.reveal).toBeLessThan(tl.duration());
  });
});
