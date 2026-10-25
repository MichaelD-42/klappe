import { expect, test } from 'vitest'
import { vennLayout } from '../../src/fx/venn'

const rect = { x: 160, y: 120, w: 1600, h: 800 }
const within = (p: { x: number; y: number }, c: { x: number; y: number; r: number }) => Math.hypot(p.x - c.x, p.y - c.y) < c.r

for (const n of [2, 3] as const)
  test(`with ${n} sets, each region's label point is in exactly that region's circles`, () => {
    const { circles, regions } = vennLayout(rect, n)
    expect(Object.keys(regions)).toHaveLength(2 ** n - 1)
    for (const [key, p] of Object.entries(regions)) {
      const inn = key.split('+').map(Number)
      circles.forEach((c, i) => expect(within(p, c), `${key} vs circle ${i}`).toBe(inn.includes(i)))
    }
  })

for (const n of [2, 3] as const)
  test(`with ${n} sets, the circles and their name bands stay inside the rect`, () => {
    const { circles, names } = vennLayout(rect, n)
    for (const c of circles) {
      expect(c.x - c.r).toBeGreaterThanOrEqual(rect.x - 1e-6)
      expect(c.x + c.r).toBeLessThanOrEqual(rect.x + rect.w + 1e-6)
      expect(c.y - c.r).toBeGreaterThanOrEqual(rect.y + 48 - 1e-6)
      expect(c.y + c.r).toBeLessThanOrEqual(rect.y + rect.h - 48 + 1e-6)
    }
    expect(names.map((p) => p.above)).toEqual(n === 2 ? [true, true] : [true, true, false])
  })
