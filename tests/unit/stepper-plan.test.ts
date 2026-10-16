import { describe, it, expect } from "vitest";
import { planMove } from "../../src/stepper";
import type { StepAddr } from "../../src/types";

const at = (index: number, canvas: number): StepAddr => ({ index, canvas, section: "s", scene: "c", step: 1 });

describe("planMove", () => {
  it("plays forward by one on the same canvas", () => {
    expect(planMove(at(2, 0), at(3, 0), "play")).toEqual({ kind: "play", transition: "none" });
  });
  it("plays with a fade forward by one onto another canvas", () => {
    expect(planMove(at(3, 0), at(4, 1), "play")).toEqual({ kind: "play", transition: "fade" });
  });
  it("cuts backward", () => {
    expect(planMove(at(3, 0), at(2, 0), "play")).toEqual({ kind: "seek", transition: "cut" });
    expect(planMove(at(4, 1), at(3, 0), "play")).toEqual({ kind: "seek", transition: "cut" });
  });
  it("cuts a jump of 3", () => {
    expect(planMove(at(1, 0), at(4, 0), "play")).toEqual({ kind: "seek", transition: "cut" });
  });
  it("cuts from nowhere", () => {
    expect(planMove(null, at(0, 0), "play")).toEqual({ kind: "seek", transition: "cut" });
  });
  it("cuts forward by one when asked to cut", () => {
    expect(planMove(at(2, 0), at(3, 0), "cut")).toEqual({ kind: "seek", transition: "cut" });
  });
});
