import { describe, expect, test } from 'vitest'
import { magicBox, magicFit } from '../../src/fx/magic'

describe('magic move box', () => {
  test('a screen rect becomes stage pixels: the stage offset removed, the window fit undone', () => {
    // The stage fit into a 1366x768 window: scale 1366/1920, no offset.
    const k = 1366 / 1920
    const b = magicBox({ left: 100 * k, top: 50 * k, width: 300 * k, height: 80 * k }, { left: 0, top: 0, width: 1366, height: 768 })
    expect([b.x, b.y, b.w, b.h].map((v) => Math.round(v * 1e6) / 1e6)).toEqual([100, 50, 300, 80])
    // Letterboxed: the stage starts 20 px down at half size.
    expect(magicBox({ left: 10, top: 30, width: 50, height: 20 }, { left: 0, top: 20, width: 960, height: 540 })).toEqual({ x: 20, y: 20, w: 100, h: 40 })
  })
})

describe('magic move fit', () => {
  test('a stand-in the size of the box covers it exactly', () => {
    expect(magicFit({ x: 100, y: 200, w: 300, h: 80 }, { w: 300, h: 80 })).toEqual({ x: 100, y: 200, scale: 1 })
  })
  test('scales uniformly by the smaller ratio and centres in the box, so text does not stretch', () => {
    // Twice as wide but only 1.5 times as tall: scale 1.5, centred across.
    expect(magicFit({ x: 0, y: 0, w: 600, h: 120 }, { w: 300, h: 80 })).toEqual({ x: 75, y: 0, scale: 1.5 })
    // A narrower box: scale 0.5, centred down.
    expect(magicFit({ x: 10, y: 10, w: 150, h: 100 }, { w: 300, h: 80 })).toEqual({ x: 10, y: 40, scale: 0.5 })
  })
  test('the old look ends inside the new box and the new look starts inside the old one', () => {
    const a = { x: 100, y: 100, w: 200, h: 50 }
    const b = { x: 900, y: 600, w: 300, h: 150 }
    const end = magicFit(b, { w: 200, h: 50 })
    expect(200 * end.scale).toBeLessThanOrEqual(300)
    expect(50 * end.scale).toBeLessThanOrEqual(150)
    const start = magicFit(a, { w: 300, h: 150 })
    expect(300 * start.scale).toBeLessThanOrEqual(200)
    expect(150 * start.scale).toBeLessThanOrEqual(50)
  })
  test('an empty stand-in keeps scale 1', () => {
    expect(magicFit({ x: 5, y: 5, w: 10, h: 10 }, { w: 0, h: 0 })).toEqual({ x: 10, y: 10, scale: 1 })
  })
})
