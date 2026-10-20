import { expect, test } from 'vitest'
import { rowY, sequence } from '../../src/fx/sequence'

const rect = { x: 160, y: 130, w: 1600, h: 780 }

test('rows are evenly spaced and the 12-message scene stays in frame', () => {
  const ys = Array.from({ length: 12 }, (_, i) => rowY(i, 12, rect))
  const gaps = ys.slice(1).map((y, i) => y - ys[i])
  for (const g of gaps) expect(g).toBeCloseTo(gaps[0], 6)
  expect(ys[0]).toBeGreaterThan(rect.y + 64)
  expect(ys[11]).toBeLessThan(rect.y + rect.h)
  expect(gaps[0]).toBeGreaterThanOrEqual(36)
})

test('an unknown actor id in messages throws', () => {
  const ctx: any = {}
  expect(() => sequence(ctx, { ...rect, actors: [{ id: 'a', label: 'A' }], messages: [{ from: 'a', to: 'zz', text: 'x' }] })).toThrow('sequence: unknown actor "zz"')
})
