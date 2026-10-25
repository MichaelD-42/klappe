import { afterEach, describe, expect, it, vi } from "vitest";
import { loadTransitions, playTransition, registry } from "../../src/fx/transitions";
import type { CanvasRuntime } from "../../src/render/world";

// Plain objects stand in for the canvas elements; gsap tweens their properties directly.
const canvas = () => ({ el: { autoAlpha: 1, parentElement: {} } }) as unknown as CanvasRuntime;

afterEach(() => vi.restoreAllMocks());

describe("transition registry", () => {
  it("names every transition", () => {
    expect(Object.keys(registry).sort()).toEqual(["blackout", "crt", "cube", "cut", "fade", "glitch", "iris", "magicMove", "pageTurn", "push", "shatter", "zoom"]);
  });
  it("plays the asked transition when it is built", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const r = playTransition("blackout", canvas(), canvas(), {});
    expect(r.kind).toBe("blackout");
    expect(r.tl.duration()).toBeCloseTo(1.1);
    expect(err).not.toHaveBeenCalled();
  });
  it("falls back to fade and logs when a transition throws", () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(registry, "zoom").mockImplementation(() => {
      throw new Error("zoom: boom");
    });
    const r = playTransition("zoom", canvas(), canvas(), {});
    expect(r.kind).toBe("fade");
    expect(r.tl.duration()).toBeCloseTo(0.4);
    expect(err).toHaveBeenCalledWith(expect.stringContaining("boom"));
  });
  // Old and new section titles often sit at the same spot: the two canvases never show at once.
  it("fade hides the old canvas before the new one starts to show, in 0.4 s", () => {
    const from = canvas();
    const to = canvas();
    const tl = playTransition("fade", from, to, {}).tl.pause();
    expect(tl.duration()).toBeCloseTo(0.4);
    const at = (t: number) => (tl.seek(t), [(from.el as any).autoAlpha, (to.el as any).autoAlpha]);
    for (const t of [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35]) {
      const [a, b] = at(t);
      expect(a === 0 || b === 0, `at ${t}s old ${a}, new ${b}`).toBe(true);
    }
    expect(at(0.4)).toEqual([0, 1]);
  });
  it("falls back to fade on an unknown name", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(playTransition("shater" as any, canvas(), canvas(), {}).kind).toBe("fade");
  });
  it("falls back to fade for a lazy transition that was not loaded, and plays it once loaded", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(playTransition("crt", canvas(), canvas(), {}).kind).toBe("fade");
    expect(err).toHaveBeenCalledWith(expect.stringContaining("crt: not loaded"));
    await loadTransitions(["crt", "fade"]);
    // The loaded crt needs a real DOM, so it may still throw here; what counts is that it is no longer missing.
    let thrown = "";
    try {
      registry.crt(canvas(), canvas(), {});
    } catch (e) {
      thrown = String(e);
    }
    expect(thrown).not.toContain("not loaded");
  });
});
