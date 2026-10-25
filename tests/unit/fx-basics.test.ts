import { gsap } from 'gsap'
import { expect, test } from 'vitest'
import { hide, show } from '../../src/fx/basics'

const el = (n = 0) => ({ autoAlpha: n }) as unknown as Element

test('show fades a list in over 0.6 s by default; hide fades out over the given duration', () => {
  const [a, b] = [el(), el()]
  const tl = gsap.timeline({ paused: true })
  show([a, b])(tl)
  hide(a, { duration: 0.2 })(tl)
  const [s, h] = tl.getChildren() as gsap.core.Tween[]
  expect(s.targets()).toEqual([a, b])
  expect(s.vars).toMatchObject({ autoAlpha: 1, duration: 0.6 })
  expect(h.targets()).toEqual([a])
  expect(h.vars).toMatchObject({ autoAlpha: 0, duration: 0.2 })
  expect(tl.duration()).toBeCloseTo(0.8)
})

test('making an adder adds nothing and changes nothing; only calling it does', () => {
  const a = el()
  const tl = gsap.timeline({ paused: true })
  const s = show(a)
  hide(a)
  expect(tl.getChildren()).toEqual([])
  expect((a as unknown as { autoAlpha: number }).autoAlpha).toBe(0)
  s(tl)
  expect(tl.getChildren()).toHaveLength(1)
})
