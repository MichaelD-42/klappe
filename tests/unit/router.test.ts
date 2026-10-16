import { describe, it, expect } from "vitest";
import { formatHash, resolveHash } from "../../src/router";
import type { StepAddr } from "../../src/types";

const spec: [string, string, number][] = [
  ["intro", "title", 1],
  ["value-stream", "overview", 1],
  ["value-stream", "analysis", 2],
  ["value-stream", "clarification", 3],
  ["outro", "thanks", 1],
];
const steps: StepAddr[] = spec.flatMap(([section, scene, n]) => Array.from({ length: n }, (_, i) => ({ section, scene, step: i + 1 })))
  .map((s, index) => ({ ...s, index, canvas: 0 }));

describe("resolveHash", () => {
  const idx = (scene: string, step: number) => steps.find((s) => s.scene === scene && s.step === step)!.index;
  it("resolves an exact address", () => {
    expect(resolveHash("#/value-stream/clarification/2", steps)).toEqual({ index: idx("clarification", 2), exact: true });
  });
  it("falls back to the scene's step 1 for a stale step", () => {
    expect(resolveHash("#/value-stream/clarification/99", steps)).toEqual({ index: idx("clarification", 1), exact: false });
  });
  it("falls back to the section's first step for a stale scene", () => {
    expect(resolveHash("#/value-stream/renamed/2", steps)).toEqual({ index: idx("overview", 1), exact: false });
  });
  it("treats a missing step as step 1", () => {
    expect(resolveHash("#/value-stream/analysis", steps)).toEqual({ index: idx("analysis", 1), exact: true });
  });
  it("falls back to 0 for junk or empty hashes", () => {
    expect(resolveHash("#garbage", steps).index).toBe(0);
    expect(resolveHash("", steps).index).toBe(0);
  });
  it("round-trips formatHash for every step", () => {
    for (const s of steps) expect(resolveHash(formatHash(s), steps)).toEqual({ index: s.index, exact: true });
  });
});
