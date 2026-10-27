import { expect, test } from 'vitest'
import { pyramidLayout } from '../../src/fx/pyramid'

const rect = { x: 460, y: 140, w: 1000, h: 760 }

test('the layers fill the rect bottom-up, each narrower at its top, the label box inside its top edge', () => {
  const L = pyramidLayout(rect, 4)
  expect(L).toHaveLength(4)
  expect(L[0].points[0].y).toBeCloseTo(rect.y + rect.h, 1)
  expect(L[3].points[2].y).toBeCloseTo(rect.y, 1)
  expect(L[0].points[1].x - L[0].points[0].x).toBeCloseTo(rect.w, 1)
  for (const [i, { points: [bl, br, tr, tl], label }] of L.entries()) {
    expect(tr.x - tl.x, `layer ${i}`).toBeLessThan(br.x - bl.x)
    expect(label.x).toBeGreaterThan(tl.x)
    expect(label.x + label.w).toBeLessThan(tr.x)
    expect(label.y).toBeCloseTo(tl.y, 1)
    expect(label.y + label.h).toBeCloseTo(bl.y, 1)
    if (i > 0) expect(L[i - 1].points[3].y - bl.y, `gap under layer ${i}`).toBeCloseTo(8, 1)
  }
  expect(L[3].points[2].x - L[3].points[3].x).toBeCloseTo(0.3 * rect.w, 1)
})

test('a stack has layers of one width', () => {
  for (const { points } of pyramidLayout(rect, 3, 'stack')) {
    expect(points[1].x - points[0].x).toBeCloseTo(rect.w, 1)
    expect(points[2].x - points[3].x).toBeCloseTo(rect.w, 1)
  }
})

test('an inverted pyramid narrows downwards: widest at the top, the label box inside each bottom edge', () => {
  const L = pyramidLayout(rect, 4, 'inverted')
  expect(L[3].points[2].x - L[3].points[3].x).toBeCloseTo(rect.w, 1)
  expect(L[0].points[1].x - L[0].points[0].x).toBeCloseTo(0.3 * rect.w, 1)
  for (const [i, { points: [bl, br, tr, tl], label }] of L.entries()) {
    expect(br.x - bl.x, `layer ${i}`).toBeLessThan(tr.x - tl.x)
    expect(label.x).toBeGreaterThan(bl.x)
    expect(label.x + label.w).toBeLessThan(br.x)
  }
})
