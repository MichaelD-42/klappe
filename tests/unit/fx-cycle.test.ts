import { expect, test } from 'vitest'
import { cycleLayout, vModelLayout } from '../../src/fx/cycle'

const ends = (d: string) => {
  const n = d.match(/-?[\d.]+/g)!.map(Number)
  return [{ x: n[0], y: n[1] }, { x: n[n.length - 2], y: n[n.length - 1] }]
}

test('cycle nodes sit on the ring clockwise from the top, and each arc runs from outside one box to outside the next', () => {
  const c = { x: 960, y: 500, r: 330 }
  const { nodes, arcs, problem } = cycleLayout(c, 4)
  expect(problem).toBeUndefined()
  expect(nodes).toEqual([{ x: 960, y: 170 }, { x: 1290, y: 500 }, { x: 960, y: 830 }, { x: 630, y: 500 }])
  expect(arcs).toHaveLength(4)
  const out = (p: { x: number; y: number }, k: number) => Math.abs(p.x - nodes[k].x) >= 120 + 16 - 1 || Math.abs(p.y - nodes[k].y) >= 40 + 16 - 1
  arcs.forEach((a, k) => {
    const [p0, p1] = ends(a.d)
    expect(Math.hypot(p0.x - c.x, p0.y - c.y)).toBeCloseTo(330, 0)
    expect(out(p0, k), `arc ${k} start`).toBe(true)
    expect(out(p1, (k + 1) % 4), `arc ${k} end`).toBe(true)
    expect(ends(a.head)[0]).not.toEqual(p1) // the head's first stroke starts off the tip
  })
})

test('too many phases for the ring give a problem and no arcs', () => {
  const r = cycleLayout({ x: 0, y: 0, r: 200 }, 10)
  expect(r.problem).toBe('cycle: 10 phases do not fit a ring of radius 200')
  expect(r.arcs).toEqual([])
})

test('vModel: each level is a mirrored pair on one row, stepping in, with the link between their inner sides', () => {
  const rect = { x: 160, y: 140, w: 1600, h: 760 }
  const { left, right, links, problem } = vModelLayout(rect, 4)
  expect(problem).toBeUndefined()
  left.forEach((l, i) => {
    const r = right[i]
    expect(r.y).toBe(l.y)
    expect(l.x - rect.x).toBeCloseTo(rect.x + rect.w - (r.x + r.w), 1)
    expect(links[i].x1).toBeCloseTo(l.x + l.w, 1)
    expect(links[i].x2).toBe(r.x)
    expect(links[i].y).toBeCloseTo(l.y + l.h / 2, 1)
    if (i) expect(l.x).toBeGreaterThan(left[i - 1].x)
    if (i) expect(l.y).toBeGreaterThanOrEqual(left[i - 1].y + left[i - 1].h + 40)
  })
  expect(links[3].x2 - links[3].x1).toBeCloseTo(80, 1)
  expect(left[3].y + left[3].h).toBeLessThanOrEqual(rect.y + rect.h - 90)
})

test('vModel: too many levels for the height give a problem', () => {
  expect(vModelLayout({ x: 0, y: 0, w: 1600, h: 500 }, 8).problem).toBe('vModel: 8 levels do not fit 500px')
})
