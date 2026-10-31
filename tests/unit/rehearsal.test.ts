import { describe, expect, it } from "vitest";
import { sceneSeconds, stepSeconds } from "../../src/plan";
import { rehearsal } from "../../src/speaker/rehearsal";

const setup = (storage?: Parameters<typeof rehearsal>[2]) => {
  let ms = 0;
  const r = rehearsal("k", () => ms, storage);
  return { r, at: (s: number) => void (ms = s * 1000) };
};
const memory = () => {
  const m = new Map<string, string>();
  return { m, getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

describe("rehearsal", () => {
  it("adds the time of a scene on leaving it, and again on coming back", () => {
    const { r, at } = setup();
    r.enter("a/x");
    r.toggle(); // starts at 0 s, a/x on show
    at(10);
    r.enter("a/y");
    at(14);
    r.enter("a/x");
    at(20);
    expect(r.times()).toEqual({ "a/x": 16, "a/y": 4 });
  });

  it("records nothing while off, and stopping keeps the last run", () => {
    const { r, at } = setup();
    r.enter("a/x");
    at(5);
    expect(r.times()).toEqual({});
    r.toggle();
    at(8);
    r.toggle();
    at(30);
    expect(r.times()).toEqual({ "a/x": 3 });
  });

  it("a new run replaces the last, reset clears it", () => {
    const { r, at } = setup();
    r.enter("a/x");
    r.toggle();
    at(4);
    r.toggle();
    r.toggle();
    at(5);
    expect(r.times()).toEqual({ "a/x": 1 });
    r.reset();
    expect(r.times()).toEqual({});
  });

  it("stores the record and reads it back; reset removes it", () => {
    const s = memory();
    const { r, at } = setup(s);
    r.enter("a/x");
    r.toggle();
    at(7);
    r.times();
    expect(JSON.parse(s.m.get("k")!)).toEqual({ "a/x": 7 });
    expect(setup(s).r.times()).toEqual({ "a/x": 7 });
    r.reset();
    expect(s.m.has("k")).toBe(false);
  });

  it("works when storage throws", () => {
    const boom = () => {
      throw new Error("denied");
    };
    const { r, at } = setup({ getItem: boom, setItem: boom, removeItem: boom });
    r.enter("a/x");
    r.toggle();
    at(3);
    expect(r.times()).toEqual({ "a/x": 3 });
    r.reset();
    expect(r.times()).toEqual({});
  });
});

describe("plan", () => {
  it("a step takes at least 15 s; a scene adds its own notes", () => {
    expect(stepSeconds("")).toBe(15);
    expect(sceneSeconds({ notes: "", steps: [{ notes: "" }, { notes: "" }] })).toBe(30);
    expect(sceneSeconds({ notes: "word ".repeat(130), steps: [] })).toBe(60);
  });
});
