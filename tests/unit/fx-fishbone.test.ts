import { expect, test } from "vitest";
import { fishboneLayout } from "../../src/fx/fishbone";

const causes = ["People", "Process", "Tools", "Material", "Measure"].map((label) => ({ label, items: ["One cause", "Another"] }));
const rect = { x: 100, y: 100, w: 1600, h: 800 };

test("bones alternate above and below the spine, the first pair nearest the head, each slanting back", () => {
  const lay = fishboneLayout({ effect: "Late releases", causes, ...rect });
  expect(lay.problem).toBeUndefined();
  expect(lay.spine[0]).toEqual({ x: 100, y: 500 });
  expect(lay.spine[1].x).toBe(lay.head.x);
  expect(lay.head.x + lay.head.w).toBe(1700);
  expect(lay.bones.map((b) => b.top)).toEqual([true, false, true, false, true]);
  expect(lay.bones[0].base.x).toBeGreaterThan(lay.bones[2].base.x);
  expect(lay.bones[2].base.x).toBeGreaterThan(lay.bones[4].base.x);
  for (const b of lay.bones) {
    expect(b.base.y).toBe(500);
    expect(b.end.x).toBeLessThan(b.base.x);
    expect(b.end.x).toBeGreaterThanOrEqual(100);
    // causes on the bone, between its ends, in order from its outer end
    b.items.forEach((it, j) => {
      expect(it.at.x).toBeGreaterThan(b.end.x);
      expect(it.at.x).toBeLessThan(b.base.x);
      if (j) expect(it.at.x).toBeGreaterThan(b.items[j - 1].at.x);
    });
  }
});

test("a cause too long for its bone, or too many on one bone, is a problem", () => {
  expect(fishboneLayout({ effect: "E", causes: [{ label: "A", items: ["x".repeat(80)] }, ...causes], ...rect }).problem).toBe(
    `fishbone: "${"x".repeat(80)}" is too long for its bone; shorten it or use fewer causes`,
  );
  expect(fishboneLayout({ effect: "E", causes: [{ label: "A", items: Array(12).fill("c") }], x: 0, y: 0, w: 1600, h: 500 }).problem).toBe(
    'fishbone: 12 causes on "A" do not fit its bone; use a taller rect',
  );
});
