import { expect, test } from 'vitest'
import { matrixLayout } from '../../src/fx/matrix'

const rect = { x: 160, y: 140, w: 1600, h: 760 }
type R = { x: number; y: number; w: number; h: number }
const inside = (a: R, b: R) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h
const apart = (a: R, b: R) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y

test('slots sit inside their quadrant and no two overlap', () => {
  const { plot, quads, slots } = matrixLayout(rect)
  expect(inside(plot, rect)).toBe(true)
  const all = Object.entries(slots).flatMap(([q, list]) => {
    expect(list.length, q).toBe(6)
    for (const s of list) expect(inside(s, quads[q as keyof typeof quads]), q).toBe(true)
    return list
  })
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(apart(all[i], all[j]), `${i} ${j}`).toBe(true)
})

test('a rect too low for one row has no slots', () => {
  expect(matrixLayout({ x: 0, y: 0, w: 800, h: 200 }).slots.tl).toEqual([])
})

test('the slot columns sit 32 px in from the quadrant sides, the inset of the quadrant names', () => {
  const { quads, slots } = matrixLayout(rect)
  for (const [q, list] of Object.entries(slots)) {
    const b = quads[q as keyof typeof quads]
    expect(Math.min(...list.map((s) => s.x)) - b.x, q).toBeCloseTo(32, 1)
    expect(b.x + b.w - Math.max(...list.map((s) => s.x + s.w)), q).toBeCloseTo(32, 1)
  }
})
