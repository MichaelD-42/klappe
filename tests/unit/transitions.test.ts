import { afterEach, describe, expect, it, vi } from "vitest";
import { playTransition, registry } from "../../src/fx/transitions";
import type { CanvasRuntime } from "../../src/render/world";

// Plain objects stand in for the canvas elements; gsap tweens their properties directly.
const canvas = () => ({ el: { autoAlpha: 1, parentElement: {} } }) as unknown as CanvasRuntime;

afterEach(() => vi.restoreAllMocks());

describe("transition registry", () => {
  it("names every transition", () => {
    expect(Object.keys(registry).sort()).toEqual(["blackout", "crt", "cut", "fade", "shatter", "zoom"]);
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
    const r = playTransition("shatter", canvas(), canvas(), {});
    expect(r.kind).toBe("fade");
    expect(r.tl.duration()).toBeCloseTo(0.4);
    expect(err).toHaveBeenCalledWith(expect.stringContaining("transitionShatter: not built yet"));
  });
  it("falls back to fade on an unknown name", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(playTransition("shater" as any, canvas(), canvas(), {}).kind).toBe("fade");
  });
});
