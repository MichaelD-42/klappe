import { describe, it, expect } from "vitest";
import { layoutDeck, buildStepList } from "../../src/layout";
import type { Deck, Rect, Scene, Section } from "../../src/types";

const scene = (id: string, sectionId: string, steps = 1, place?: (r: Record<string, Rect>) => Rect): Scene => ({
  id, order: 0, title: id, notes: "", sectionId, source: id,
  steps: Array.from({ length: steps }, () => ({ text: "", notes: "", kind: "step" as const })),
  module: place ? { place } : undefined,
});
const section = (id: string, scenes: Scene[]): Section => ({ id, order: 0, title: id, notes: "", scenes });
const deck = (sections: Section[], sharedCanvas: string[][] = []): Deck => ({
  meta: { title: "T", lang: "en", theme: "calm", intensity: "calm", confidential: false, sharedCanvas },
  sections,
});
const two = (shared: string[][] = [], place?: (r: Record<string, Rect>) => Rect) =>
  deck([section("a", [scene("a1", "a"), scene("a2", "a", 1, place)]), section("b", [scene("b1", "b")])], shared);

describe("layoutDeck", () => {
  it("gives each section its own canvas", () => {
    const { canvases, problems } = layoutDeck(two());
    expect(problems).toEqual([]);
    expect(canvases.map((c) => c.id)).toEqual(["a", "b"]);
  });
  it("merges shared sections and runs scene rects on", () => {
    const { canvases } = layoutDeck(two([["a", "b"]]));
    expect(canvases).toHaveLength(1);
    expect(canvases[0].id).toBe("a+b");
    expect(canvases[0].sectionIds).toEqual(["a", "b"]);
    expect(["a1", "a2", "b1"].map((id) => canvases[0].rects[id].x)).toEqual([0, 1920, 3840]);
  });
  it("respects place() and sizes the canvas to the bounding box", () => {
    const { canvases } = layoutDeck(two([], () => ({ x: 0, y: 2000, w: 1920, h: 1080 })));
    expect(canvases[0].rects.a2).toEqual({ x: 0, y: 2000, w: 1920, h: 1080 });
    expect(canvases[0].size.h).toBe(3080);
  });
  it("passes rects laid out so far to place()", () => {
    let seen: string[] = [];
    layoutDeck(two([], (r) => ((seen = Object.keys(r)), { x: 0, y: 0, w: 1, h: 1 })));
    expect(seen).toEqual(["a1"]);
  });
  it("reports a place() that throws and uses the default rect", () => {
    const { canvases, problems } = layoutDeck(two([], () => { throw new Error("boom"); }));
    expect(problems).toEqual(["a2: place() boom"]);
    expect(canvases[0].rects.a2).toEqual({ x: 1920, y: 0, w: 1920, h: 1080 });
  });
  it("reports an unknown shared id", () => {
    const { problems } = layoutDeck(two([["a", "nope"]]));
    expect(problems.some((p) => p.includes("nope"))).toBe(true);
  });
});

describe("buildStepList", () => {
  it("numbers steps globally, steps start at 1", () => {
    const d = deck([section("a", [scene("x", "a", 2), scene("y", "a", 3)])]);
    const addr = buildStepList(d, layoutDeck(d).canvases);
    expect(addr.map((s) => s.index)).toEqual([0, 1, 2, 3, 4]);
    expect(addr[2]).toEqual({ index: 2, canvas: 0, section: "a", scene: "y", step: 1 });
  });
  it("uses the canvas index", () => {
    const d = two();
    expect(buildStepList(d, layoutDeck(d).canvases).map((s) => s.canvas)).toEqual([0, 0, 1]);
  });
});

describe("a section listed twice in one shared group", () => {
  it("is on its canvas once", () => {
    const d = deck([section("a", [scene("s1", "a")]), section("b", [scene("s2", "b")])], [["a", "a", "b"]]);
    const { canvases, problems } = layoutDeck(d);
    expect(problems).toEqual([]);
    expect(canvases.map((c) => c.sectionIds)).toEqual([["a", "b"]]);
  });
});

describe("place() that gives no usable rect", () => {
  it("reports it and uses the next free frame", () => {
    for (const bad of [undefined, { x: 1 }, { x: 0, y: 0, w: Number.NaN, h: 1080 }]) {
      const { canvases, problems } = layoutDeck(two([], () => bad as unknown as Rect));
      expect(problems).toEqual(["a2: place() returned no rect {x, y, w, h}; using the next free frame"]);
      expect(canvases[0].rects.a2).toEqual({ x: 1920, y: 0, w: 1920, h: 1080 });
      expect(canvases[0].size).toEqual({ w: 3840, h: 1080 });
    }
  });
});
