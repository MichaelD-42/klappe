import { expect, test } from 'vitest'
import { zoomLayout, zoomView } from '../../src/fx/semanticzoom'

const rect = { x: 160, y: 120, w: 1600, h: 760 }
const boxes = [
  { label: 'Shop', children: [{ label: 'Web' }, { label: 'API', children: [{ label: 'Orders' }, { label: 'Payments' }, { label: 'Stock' }] }, { label: 'DB' }] },
  { label: 'Billing' },
]
const inside = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x >= b.x - 1e-6 && a.y >= b.y - 1e-6 && a.x + a.w <= b.x + b.w + 1e-6 && a.y + a.h <= b.y + b.h + 1e-6

test('boxes nest inside their parents, siblings apart, ids as paths', () => {
  const cells = zoomLayout(boxes, rect)
  expect(cells.map((c) => c.id)).toEqual(['Shop', 'Shop/Web', 'Shop/API', 'Shop/API/Orders', 'Shop/API/Payments', 'Shop/API/Stock', 'Shop/DB', 'Billing'])
  const by = new Map(cells.map((c) => [c.id, c]))
  for (const c of cells) expect(inside(c, c.parent ? by.get(c.parent)! : rect)).toBe(true)
  for (const a of cells)
    for (const b of cells)
      if (a !== b && a.parent === b.parent) expect(a.x + a.w <= b.x + 1e-6 || b.x + b.w <= a.x + 1e-6 || a.y + a.h <= b.y + 1e-6 || b.y + b.h <= a.y + 1e-6).toBe(true)
  expect(by.get('Shop/API')!.leaf).toBe(false)
  expect(by.get('Shop/DB')!.leaf).toBe(true)
})

test('every level reads the same size on screen with the camera on its parent', () => {
  const cells = zoomLayout(boxes, rect, 1920)
  const by = new Map(cells.map((c) => [c.id, c]))
  for (const c of cells) {
    const zoom = c.parent ? 1920 / zoomView(by.get(c.parent)!).w : 1
    expect(c.font * zoom).toBeCloseTo(32)
  }
})

test("the camera's view on a box holds it with a margin, at the frame's aspect", () => {
  const v = zoomView({ x: 100, y: 100, w: 320, h: 180 })
  expect(v.w / v.h).toBeCloseTo(16 / 9)
  expect(inside({ x: 100, y: 100, w: 320, h: 180 }, v)).toBe(true)
  expect(v.w).toBeCloseTo(400)
})

test('a level with links spaces its boxes wider, so the arrows have room; the other levels keep their gap', () => {
  const gap = (cells: ReturnType<typeof zoomLayout>, a: string, b: string) => {
    const [p, q] = [cells.find((c) => c.id === a)!, cells.find((c) => c.id === b)!]
    return Math.max(q.x - (p.x + p.w), q.y - (p.y + p.h), p.x - (q.x + q.w), p.y - (q.y + q.h))
  }
  const plain = zoomLayout(boxes, rect)
  const linked = zoomLayout(boxes, rect, 1920, [''])
  const firstTwo = (cells: typeof plain) => cells.filter((c) => c.depth === 0).slice(0, 2).map((c) => c.id) as [string, string]
  expect(gap(linked, ...firstTwo(linked))).toBeGreaterThan(3 * gap(plain, ...firstTwo(plain)))
})
