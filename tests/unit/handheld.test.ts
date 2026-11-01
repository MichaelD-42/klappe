import { describe, expect, it } from "vitest";
import { HANDHELD, handheldPose } from "../../src/camera";
import { toDeckMeta } from "../../src/parse/frontmatter";

describe("handheld", () => {
  it("is opt-in in deck.md; anything but true or false is a problem", () => {
    expect(toDeckMeta({ title: "x", handheld: true }).meta.handheld).toBe(true);
    expect(toDeckMeta({ title: "x" }).meta.handheld).toBeUndefined();
    expect(toDeckMeta({ title: "x", handheld: "yes" }).problems).toEqual(["deck.md: handheld is true or false"]);
  });

  it("wanders slowly within its bounds, and its scale hides the frame's edges at the furthest reach", () => {
    const poses = Array.from({ length: 600 }, (_, i) => handheldPose(i * 0.1));
    for (const p of poses) {
      expect(Math.abs(p.x)).toBeLessThanOrEqual(HANDHELD.px);
      expect(Math.abs(p.y)).toBeLessThanOrEqual(HANDHELD.px);
      expect(Math.abs(p.rotation)).toBeLessThanOrEqual(HANDHELD.deg);
    }
    // Barely visible: under a pixel between two frames at 60 fps.
    for (let i = 0; i < 1000; i++) {
      const [a, b] = [handheldPose(i / 60), handheldPose((i + 1) / 60)];
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThan(0.1);
    }
    // At 1920x1080, the shift plus the rotation's reach at the corner stays inside the scale's overshoot.
    const reach = HANDHELD.px + Math.sin((HANDHELD.deg * Math.PI) / 180) * Math.hypot(960, 540);
    expect((handheldPose(0).scale - 1) * 540).toBeGreaterThan(reach);
  });
});
