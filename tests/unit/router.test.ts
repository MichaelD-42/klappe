import { describe, it, expect, vi, afterEach } from "vitest";
import { formatHash, resolveHash, Router } from "../../src/router";
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
  it("decodes percent-encoded ids", () => {
    const s: StepAddr[] = [0, 1].map((i) => ({ index: i, canvas: 0, section: "übersicht", scene: "old way", step: i + 1 }));
    expect(resolveHash("#/%C3%BCbersicht/old%20way/2", s)).toEqual({ index: 1, exact: true });
  });
  it("treats a bad escape as garbage", () => {
    expect(resolveHash("#/%E0%A4%A/x/1", steps)).toEqual({ index: 0, exact: false });
  });
  it("round-trips formatHash for every step", () => {
    for (const s of steps) expect(resolveHash(formatHash(s), steps)).toEqual({ index: s.index, exact: true });
  });
});

describe("empty deck", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("resolves to 0", () => {
    expect(resolveHash("", [])).toEqual({ index: 0, exact: false });
  });
  it("start() and push() do not throw", () => {
    const history = { pushState: vi.fn(), replaceState: vi.fn() };
    vi.stubGlobal("window", { addEventListener: vi.fn() });
    vi.stubGlobal("location", { hash: "" });
    vi.stubGlobal("history", history);
    const r = new Router([], () => {});
    expect(r.start()).toBe(0);
    r.push(0);
    expect(history.pushState).not.toHaveBeenCalled();
    expect(history.replaceState).not.toHaveBeenCalled();
  });
});

describe("Router.push", () => {
  afterEach(() => vi.unstubAllGlobals());
  it("is idempotent and silent during an async popstate", async () => {
    const history = { pushState: vi.fn(), replaceState: vi.fn() };
    const loc = { hash: formatHash(steps[2]) };
    let pop = () => {};
    vi.stubGlobal("window", { addEventListener: (_: string, f: () => void) => (pop = f) });
    vi.stubGlobal("location", loc);
    vi.stubGlobal("history", history);
    const r: Router = new Router(steps, async () => {
      await Promise.resolve();
      r.push(3); // late emit after an await
    });
    r.push(2); // same hash: no entry
    await pop();
    expect(history.pushState).not.toHaveBeenCalled();
    r.push(3);
    expect(history.pushState).toHaveBeenCalledTimes(1);
  });
  it("compares the decoded hash", () => {
    const history = { pushState: vi.fn(), replaceState: vi.fn() };
    const s: StepAddr[] = [{ index: 0, canvas: 0, section: "übersicht", scene: "old way", step: 1 }];
    vi.stubGlobal("window", { addEventListener: vi.fn() });
    vi.stubGlobal("location", { hash: "#/%C3%BCbersicht/old%20way/1" });
    vi.stubGlobal("history", history);
    new Router(s, () => {}).push(0);
    expect(history.pushState).not.toHaveBeenCalled();
  });
});
