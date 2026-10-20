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

test('too many messages for the height are reported', () => {
  const problems: string[] = []
  const el = () => ({ append() {}, setAttribute() {}, style: {}, appendChild: (c: unknown) => c })
  ;(globalThis as any).document = { createElement: el, createElementNS: el }
  const ctx: any = { svg: el(), html: el(), problem: (m: string) => problems.push(m) }
  const messages = Array.from({ length: 30 }, () => ({ from: 'a', to: 'b', text: 'x' }))
  try {
    sequence(ctx, { ...rect, actors: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], messages })
  } finally {
    delete (globalThis as any).document
  }
  expect(problems).toEqual(['sequence: 30 messages do not fit the height'])
})
