import { expect, test } from 'vitest'
import { edgePath, flow } from '../../src/fx/flow'

const box = (x: number, y: number) => ({ x, y, w: 100, h: 60 })

test('the same row is one straight line between the facing edges', () => {
  expect(edgePath(box(0, 0), box(300, 0))).toBe('M 100 30 L 300 30')
  expect(edgePath(box(300, 0), box(0, 0))).toBe('M 300 30 L 100 30')
})

test('the same column is one vertical line', () => {
  expect(edgePath(box(0, 0), box(0, 200))).toBe('M 50 60 L 50 200')
})

test('a diagonal goes horizontal, vertical, horizontal through the gap midpoint', () => {
  expect(edgePath(box(0, 0), box(300, 200))).toBe('M 100 30 L 200 30 L 200 230 L 300 230')
  expect(edgePath(box(300, 200), box(0, 0))).toBe('M 300 230 L 200 230 L 200 30 L 100 30')
})

test('an unknown node id in edges throws', () => {
  const ctx: any = {}
  const grid = { x: 0, y: 0, w: 400, h: 200, cols: 2, rows: 1 }
  expect(() => flow(ctx, { nodes: [{ id: 'a', label: 'A', col: 0, row: 0 }], edges: [{ from: 'a', to: 'zz' }], grid })).toThrow('flow: unknown node "zz"')
})
