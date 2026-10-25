import { gsap } from 'gsap'
import { expect, test } from 'vitest'
import { shake } from '../../src/fx/attention'

// shake only tweens x, so a plain object stands in for the element.
test('shake swings to both sides twice and ends where it began', () => {
  const target = { x: 40 }
  const tl = gsap.timeline({ paused: true })
  shake(target as unknown as Element)(tl)
  const xs: number[] = []
  for (let t = 0; t <= tl.duration() + 1e-9; t += tl.duration() / 200) xs.push((tl.seek(t), target.x))
  expect(xs[0]).toBe(40)
  expect(xs.at(-1)).toBeCloseTo(40)
  expect(Math.max(...xs)).toBeGreaterThan(48)
  expect(Math.min(...xs)).toBeLessThan(32)
  // Two cycles: right, left, right, left, so three changes of side.
  const sides = xs.map((x) => Math.sign(Math.round(x - 40))).filter((s) => s !== 0)
  expect(sides.filter((s, i) => i > 0 && s !== sides[i - 1]).length).toBe(3)
})

test('shake starts from the x the target has when the step is added', () => {
  const target = { x: -10 }
  const tl = gsap.timeline({ paused: true })
  shake(target as unknown as Element)(tl)
  tl.seek(tl.duration())
  expect(target.x).toBeCloseTo(-10)
})
