import { gsap } from 'gsap'
import { expect, test } from 'vitest'
import { followView } from '../../src/camera'
import { follow, impactShake } from '../../src/fx/camera'
import { travel } from '../../src/fx/travel'
import type { Ctx } from '../../src/types'

const scene = { x: 1920, y: 0, w: 1920, h: 1080 }

test('followView starts on the given view, then holds the point centred, zoomed in', () => {
  expect(followView(scene, { x: 2500, y: 300 }, 2, 0)).toEqual(scene)
  const end = { x: 2500 - 480, y: 300 - 270, w: 960, h: 540 }
  expect(followView(scene, { x: 2500, y: 300 }, 2, 0.3)).toEqual(end)
  expect(followView(scene, { x: 2500, y: 300 }, 2, 1)).toEqual(end)
  const mid = followView(scene, { x: 2500, y: 300 }, 2, 0.15)
  expect(mid.w).toBeCloseTo(1440)
})

// Plain objects stand in for the element, the world and the ctx; the camera records what follow asks of it.
const setup = (reducedMotion = false) => {
  const asks: { start: unknown; duration: unknown; zoom: unknown; p0: unknown; p1: unknown }[] = []
  const problems: string[] = []
  const layers = [{ y: 0 }, { y: 0 }]
  const ctx = {
    rect: scene,
    reducedMotion,
    problem: (m: string) => problems.push(m),
    html: { closest: () => ({ children: layers }) },
    camera: {
      follow: (_tl: unknown, point: (t: number) => { x: number; y: number }, o: { at: unknown; duration: unknown; zoom: unknown }) =>
        asks.push({ start: o.at, duration: o.duration, zoom: o.zoom, p0: point(0), p1: point(1) }),
    },
  } as unknown as Ctx
  return { ctx, asks, problems, layers }
}

test('follow asks the camera to track the travel path in canvas units, from the travel step start', () => {
  const { ctx, asks, problems } = setup()
  const ship = travel(ctx, { x: 0, y: 0 } as unknown as Element, { path: 'M100 200 L500 200', duration: 3 })
  const cam = follow(ctx, ship, { zoom: 2 }) // made before the step is added: the start is read in the step
  const tl = gsap.timeline({ paused: true })
  tl.to({}, { duration: 1 })
  ship(tl)
  cam(tl)
  expect(problems).toEqual([])
  expect(asks).toEqual([{ start: 1, duration: 3, zoom: 2, p0: { x: 2020, y: 200 }, p1: { x: 2420, y: 200 } }])
})

test('follow before the travel step is a problem', () => {
  const { ctx, asks, problems } = setup()
  const ship = travel(ctx, { x: 0, y: 0 } as unknown as Element, { path: 'M100 200 L500 200' })
  follow(ctx, ship)(gsap.timeline({ paused: true }))
  expect(asks).toEqual([])
  expect(problems).toEqual(["follow: add the travel's step before follow, in the same step"])
})

test('follow of a travel from an earlier step is a problem', () => {
  const { ctx, asks, problems } = setup()
  const ship = travel(ctx, { x: 0, y: 0 } as unknown as Element, { path: 'M100 200 L500 200', duration: 1 })
  const tl = gsap.timeline({ paused: true })
  ship(tl)
  tl.addLabel('step') // what the engine puts at each step start
  follow(ctx, ship)(tl)
  expect(asks).toEqual([])
  expect(problems).toEqual(["follow: the travel is in an earlier step; add follow in the travel's step"])
})

test('impactShake shakes harder in a bold deck', () => {
  const peak = (intensity: string) => {
    const { ctx, layers } = setup()
    Object.assign(ctx, { deck: { lang: 'en', intensity } })
    const tl = gsap.timeline({ paused: true })
    impactShake(ctx)(tl)
    return Math.max(...Array.from({ length: 40 }, (_, i) => (tl.seek(i * 0.01), Math.abs(layers[0].y))))
  }
  expect(peak('bold')).toBeCloseTo(peak('calm') * 1.5)
})

test('impactShake jolts the layers and ends exactly at rest', () => {
  const { ctx, layers } = setup()
  const tl = gsap.timeline({ paused: true })
  impactShake(ctx)(tl)
  expect(tl.duration()).toBeCloseTo(0.4)
  tl.seek(0.05)
  expect(Math.abs(layers[0].y)).toBeGreaterThan(1)
  tl.seek(0.4)
  expect(layers.map((l) => l.y)).toEqual([0, 0])
})

test('with reduced motion, impactShake adds nothing', () => {
  const { ctx } = setup(true)
  const tl = gsap.timeline({ paused: true })
  impactShake(ctx)(tl)
  expect(tl.duration()).toBe(0)
})
