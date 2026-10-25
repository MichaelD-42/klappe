import { gsap } from 'gsap'
import { expect, test } from 'vitest'
import { addCameraMove } from '../../src/camera'
import { rackFocus } from '../../src/fx/focus'
import { tilt } from '../../src/fx/camera'
import type { Ctx } from '../../src/types'

// rackFocus only tweens opacity and filter, so plain objects stand in for the items.
const looks = (items: { opacity: number; filter: string }[]) => items.map((i) => `${i.opacity} ${i.filter}`)

// The adders are built out of step order: the state belongs to the step that adds them, not to the call.
test('rackFocus blurs and dims the others, moves the focus, and clears', () => {
  const items = [0, 1, 2].map(() => ({ opacity: 1, filter: 'blur(0px)' }))
  const f = rackFocus({ problem: () => {} } as unknown as Ctx, items as unknown as Element[], { blur: 8, dim: 0.5 })
  const late = f.on(items[2] as unknown as Element)
  const first = f.on(0)
  const tl = gsap.timeline({ paused: true })
  const ends: number[] = []
  for (const add of [first, late, f.clear]) ends.push((add(tl), tl.duration()))
  const at = (t: number) => (tl.seek(t), looks(items))
  expect(at(ends[0])).toEqual(['1 blur(0px)', '0.5 blur(8px)', '0.5 blur(8px)'])
  expect(at(ends[1])).toEqual(['0.5 blur(8px)', '0.5 blur(8px)', '1 blur(0px)'])
  expect(at(ends[2])).toEqual(['1 blur(0px)', '1 blur(0px)', '1 blur(0px)'])
  expect(at(0)).toEqual(['1 blur(0px)', '1 blur(0px)', '1 blur(0px)'])
})

test('rackFocus names an item not in the list', () => {
  const problems: string[] = []
  const f = rackFocus({ problem: (m: string) => problems.push(m) } as unknown as Ctx, [])
  f.on(3)(gsap.timeline({ paused: true }))
  expect(problems).toEqual(['rackFocus: the item is not in the list'])
})

// A plain world inside a plain canvas: the lean turns the canvas.
const flight = (tiltDeg?: number, instant = false) => {
  const canvas = { rotationX: 0, rotationY: 0 }
  const world = { x: 0, y: 0, scale: 1, parentElement: canvas } as unknown as HTMLElement
  const tl = gsap.timeline({ paused: true })
  addCameraMove(tl, world, { x: 0, y: 0, w: 1920, h: 1080 }, { x: 5760, y: 0, w: 1920, h: 1080 }, { duration: 2, tilt: tiltDeg, instant })
  return { tl, canvas }
}

test('a tilted flight leans into its direction, peaks mid-flight and lands flat', () => {
  const { tl, canvas } = flight(5)
  expect(tl.duration()).toBe(2)
  tl.seek(1)
  expect(canvas.rotationY).toBeCloseTo(5)
  expect(canvas.rotationX).toBeCloseTo(0)
  tl.seek(2)
  expect([canvas.rotationX, canvas.rotationY]).toEqual([0, 0])
  tl.seek(0)
  expect([canvas.rotationX, canvas.rotationY]).toEqual([0, 0])
})

test('without tilt, or as a cut, the canvas does not lean', () => {
  for (const [deg, instant] of [[undefined, false], [5, true]] as const) {
    const { tl, canvas } = flight(deg, instant)
    tl.seek(tl.duration() / 2)
    expect([canvas.rotationX, canvas.rotationY]).toEqual([0, 0])
  }
})

test('tilt asks the camera for a leaning flight', () => {
  const asks: unknown[] = []
  const ctx = { camera: { to: (_tl: unknown, to: unknown, o: unknown) => asks.push([to, o]) } } as unknown as Ctx
  const to = { x: 1, y: 2, w: 3, h: 4 }
  tilt(ctx, to)(gsap.timeline())
  tilt(ctx, to, { deg: 7, duration: 3 })(gsap.timeline())
  expect(asks).toEqual([[to, { tilt: 4, duration: undefined }], [to, { tilt: 7, duration: 3 }]])
})
