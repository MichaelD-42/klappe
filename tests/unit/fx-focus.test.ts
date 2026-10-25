import { gsap } from 'gsap'
import { expect, test } from 'vitest'
import { focus } from '../../src/fx/focus'
import type { Ctx } from '../../src/types'

// focus only tweens opacity, so plain objects stand in for the items.
const setup = () => {
  const items = [{ opacity: 1 }, { opacity: 1 }, { opacity: 1 }]
  const problems: string[] = []
  const ctx = { problem: (m: string) => void problems.push(m) } as unknown as Ctx
  return { items, problems, f: focus(ctx, items as unknown as Element[]) }
}
const ops = (items: { opacity: number }[]) => items.map((i) => i.opacity)

// The adders are built out of step order: the state belongs to the step that adds them, not to the call.
test('on dims the others, a second on moves the focus, clear brings all back', () => {
  const { items, f } = setup()
  const late = f.on(items[2] as unknown as Element)
  const first = f.on(0)
  const tl = gsap.timeline({ paused: true })
  const ends: number[] = []
  for (const add of [first, late, f.clear]) ends.push((add(tl), tl.duration()))
  const at = (t: number) => (tl.seek(t), ops(items))
  expect(at(ends[0])).toEqual([1, 0.35, 0.35])
  expect(at(ends[1])).toEqual([0.35, 0.35, 1])
  expect(at(ends[2])).toEqual([1, 1, 1])
  expect(at(0)).toEqual([1, 1, 1])
})

test('dim sets how far the others fade', () => {
  const items = [{ opacity: 1 }, { opacity: 1 }]
  const f = focus({ problem: () => {} } as unknown as Ctx, items as unknown as Element[], { dim: 0.5 })
  const tl = gsap.timeline({ paused: true })
  f.on(1)(tl)
  tl.seek(tl.duration())
  expect(ops(items)).toEqual([0.5, 1])
})

test('an item not in the list is a problem and adds nothing', () => {
  const { problems, f } = setup()
  const tl = gsap.timeline({ paused: true })
  f.on(3)(tl)
  f.on({} as Element)(tl)
  expect(tl.duration()).toBe(0)
  expect(problems).toEqual(['focus: the item is not in the list', 'focus: the item is not in the list'])
})
