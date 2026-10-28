import { expect, test } from 'vitest'
import { layerStackLayout } from '../../src/fx/layerstack'

const rect = { x: 160, y: 100, w: 1600, h: 800 }

test('assembled, the slabs touch and the stack sits on the rect bottom; apart, they open evenly and fill the height', () => {
  const l = layerStackLayout(4, rect)
  expect(l.problems).toEqual([])
  const n = l.together.length
  for (let i = 1; i < n; i++) expect(l.together[i] - l.together[i - 1]).toBeCloseTo(l.t)
  expect(l.together[n - 1] + l.t + 2 * l.c).toBeCloseTo(rect.y + rect.h)
  expect(l.apart[0]).toBeCloseTo(rect.y)
  expect(l.apart[n - 1] + l.t + 2 * l.c).toBeCloseTo(rect.y + rect.h)
  const gaps = l.apart.slice(1).map((y, i) => y - l.apart[i])
  for (const g of gaps) expect(g).toBeCloseTo(gaps[0])
  expect(gaps[0]).toBeGreaterThan(l.t)
  // The slabs keep to the left of the label column.
  expect(l.cx + l.a).toBeLessThan(l.labelX)
  expect(l.labelX + l.labelW).toBeCloseTo(rect.x + rect.w)
})

test('too many layers for the height is a problem', () => {
  expect(layerStackLayout(12, { ...rect, h: 400 }).problems).toEqual(['layerStack: 12 layers do not fit 400px; use fewer layers or a taller rect'])
})
