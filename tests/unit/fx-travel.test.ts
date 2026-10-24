import { gsap } from 'gsap'
import { expect, test } from 'vitest'
import { travel } from '../../src/fx/travel'
import type { Ctx } from '../../src/types'

// Without a route, travel only tweens x, y and rotation, so plain objects stand in for the element and the ctx.
const run = (path: string, reducedMotion = false, rotate = false) => {
  const el = { x: 0, y: 0, rotation: 0 }
  const problems: string[] = []
  const ctx = { problem: (m: string) => problems.push(m), reducedMotion } as unknown as Ctx
  const tl = gsap.timeline({ paused: true })
  travel(ctx, el as unknown as Element, { path, rotate })(tl)
  return { el, tl, problems }
}

// MotionPathPlugin does not register without a window, so the move itself is checked in tests/e2e/fx-travel.e2e.test.ts.
test('travel waits at the start of the path for its step, which lasts its duration', () => {
  const { el, tl, problems } = run('M100 200 L500 200 L500 600')
  expect(problems).toEqual([])
  expect([el.x, el.y]).toEqual([100, 200])
  expect(tl.duration()).toBe(2)
})

test('rotate turns the element along the path from the start', () => {
  expect(run('M0 0 L0 300', false, true).el.rotation).toBeCloseTo(90)
  expect(run('M0 0 L0 300').el.rotation).toBe(0)
})

test('with reduced motion, travel jumps to the end', () => {
  const { el, tl } = run('M100 200 L500 200', true)
  expect(tl.duration()).toBe(0)
  tl.seek(0.001)
  expect([el.x, el.y].map(Math.round)).toEqual([500, 200])
})

test('a path with no length is a problem', () => {
  expect(run('M10 10').problems).toEqual(['travel: path has no length'])
})
