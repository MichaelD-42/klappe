import { expect, test } from "vitest";
import { mindMapLayout, type MindNode } from "../../src/fx/mindmap";

const rect = { x: 0, y: 0, w: 1600, h: 800 };
const node = (label: string, n = 0): MindNode => ({ label, children: Array.from({ length: n }, (_, i) => ({ label: `${label}${i}` })) });

test("branches sit round the centre from 12 o'clock clockwise; a sub-branch lies further out than its branch", () => {
  const lay = mindMapLayout({ label: "C", children: [node("A", 2), node("B", 2), node("D", 2), node("E", 2)] }, rect);
  expect(lay.problem).toBeUndefined();
  expect(lay.centre).toEqual({ x: 800, y: 400 });
  const angle = (p: { x: number; y: number }) => (Math.atan2((p.x - 800) / 800, -(p.y - 400) / 400) + 2 * Math.PI) % (2 * Math.PI);
  const as = lay.branches.map(angle);
  expect([...as].sort((a, b) => a - b)).toEqual(as); // clockwise, in order
  const dist = (p: { x: number; y: number }) => Math.hypot((p.x - 800) / 800, (p.y - 400) / 400);
  for (const l of lay.leaves) expect(dist(l)).toBeGreaterThan(dist(lay.branches[l.parent!]))
  // A leaf on the right reads to the right, one on the left to the left.
  for (const l of lay.leaves) if (l.x > 900) expect(l.anchor).toBe("start");
  for (const l of lay.leaves) if (l.x < 700) expect(l.anchor).toBe("end");
});

test("leaves whose labels would touch are a problem", () => {
  const lay = mindMapLayout({ label: "C", children: [node("Branch", 14), node("Other", 14)] }, { x: 0, y: 0, w: 900, h: 500 });
  expect(lay.problem).toMatch(/^mindMap: ".+" and ".+" overlap; use fewer sub-branches or a larger rect$/);
});
