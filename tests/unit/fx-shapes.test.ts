import { gsap } from 'gsap'
import { afterEach, expect, test, vi } from 'vitest'
import { arrowPath, tint } from '../../src/fx/shape'

afterEach(() => vi.unstubAllGlobals())

test('a straight arrow ends in a head whose strokes lean back from the tip, symmetric about the line', () => {
  const d = arrowPath({ x: 0, y: 0 }, { x: 100, y: 0 })
  expect(d.shaft).toBe('M0 0 Q50 0 100 0')
  const [a, tip, b] = [...d.head.matchAll(/(-?[\d.]+) (-?[\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])])
  expect(tip).toEqual([100, 0])
  expect(a[0]).toBeLessThan(100)
  expect(a[0]).toBeCloseTo(b[0])
  expect(a[1]).toBeCloseTo(-b[1])
})

test('curve > 0 bows the shaft to the left of the way it points (up, for an arrow to the right)', () => {
  expect(arrowPath({ x: 0, y: 0 }, { x: 100, y: 0 }, 0.2).shaft).toBe('M0 0 Q50 -20 100 0')
  expect(arrowPath({ x: 0, y: 0 }, { x: 100, y: 0 }, -0.2).shaft).toBe('M0 0 Q50 20 100 0')
})

// No DOM: a plain object stands in for the element, and the tokens resolve to rgb strings GSAP can tween.
test('a second tint starts where the first ends, even when its adder was made first; seek equals play', () => {
  const tokens: Record<string, string> = { '--k-accent': 'rgb(0, 0, 255)', '--k-warn': 'rgb(255, 0, 0)' }
  const el = { color: 'rgb(255, 255, 255)' }
  vi.stubGlobal('getComputedStyle', (e: typeof el) => ({ color: e.color, getPropertyValue: (n: string) => tokens[n] ?? '' }))
  const toWarn = tint(el as unknown as Element, { to: '--k-warn' })
  const toAccent = tint(el as unknown as Element, { to: '--k-accent' })
  const problem = vi.fn()
  const toNowhere = tint(el as unknown as Element, { to: '--k-nope' }, { problem } as never)
  const tl = gsap.timeline({ paused: true })
  const ends: number[] = []
  for (const add of [toAccent, toWarn, toNowhere]) (add(tl), ends.push(tl.duration()))
  expect(problem.mock.calls).toEqual([["tint: unknown token '--k-nope'"]])
  expect(el.color).toBe('rgb(255, 255, 255)') // nothing renders at load
  tl.seek(ends[1])
  expect(el.color).toBe('rgb(255, 0, 0)')
  tl.seek(ends[0])
  expect(el.color).toBe('rgb(0, 0, 255)')
  tl.seek(0)
  expect(el.color).toBe('rgb(255, 255, 255)')
  tl.seek(ends[2]) // an unknown token keeps the colour
  expect(el.color).toBe('rgb(255, 0, 0)')
})
