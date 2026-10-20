import { describe, expect, it } from "vitest";
import { remaining } from "../../src/fx/countdown";

const at = (h: number, m: number, s = 0) => new Date(2026, 9, 20, h, m, s).getTime();

describe("remaining", () => {
  it("counts to a wall-clock time today", () => {
    expect(remaining(at(10, 5, 30), "10:20")).toEqual({ text: "14:30", done: false });
  });
  it("holds 0:00 after the time, never negative", () => {
    expect(remaining(at(10, 21), "10:20")).toEqual({ text: "0:00", done: true });
  });
  it("shows h:mm:ss over 60 minutes", () => {
    const start = at(9, 0);
    expect(remaining(start, start + 90 * 60_000)).toEqual({ text: "1:30:00", done: false });
  });
  it("rounds a part second up, so 0:00 means done", () => {
    const end = at(9, 0);
    expect(remaining(end - 400, end)).toEqual({ text: "0:01", done: false });
    expect(remaining(end, end)).toEqual({ text: "0:00", done: true });
  });
});
