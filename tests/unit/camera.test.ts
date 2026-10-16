import { describe, it, expect } from "vitest";
import { frame, flight } from "../../src/camera";

const A = { x: 0, y: 0, w: 1920, h: 1080 };
const A_neighbour = { x: 1920, y: 0, w: 1920, h: 1080 };
const B_far = { x: 9600, y: 4000, w: 1920, h: 1080 };

describe("frame", () => {
  it("is the identity for a full-size rect at the origin", () => {
    expect(frame(A)).toEqual({ x: 0, y: 0, scale: 1 });
  });
  it("zooms into a smaller rect", () => {
    expect(frame({ x: 1920, y: 0, w: 960, h: 540 })).toEqual({ x: -3840, y: 0, scale: 2 });
  });
  it("centres a rect with a different aspect ratio", () => {
    const f = frame({ x: 0, y: 0, w: 960, h: 1080 }); // scale 1, 960px spare width
    expect(f).toEqual({ x: 480, y: 0, scale: 1 });
  });
});

describe("flight", () => {
  it("zooms out in the middle of a far move", () => {
    const f = flight(A, B_far);
    expect(f).toHaveLength(3);
    expect(f[0]).toEqual(frame(A));
    expect(f[2]).toEqual(frame(B_far));
    expect(f[1].scale).toBeLessThan(Math.min(frame(A).scale, frame(B_far).scale));
  });
  it("goes direct to a neighbour", () => {
    expect(flight(A, A_neighbour)).toHaveLength(2);
  });
});
