import { describe, expect, test } from 'vitest'
import { irisHole, irisRadius, pushOffset } from '../../src/fx/transitions'

describe('push offset', () => {
  test('the old canvas leaves by one frame in the direction, left by default', () => {
    expect(pushOffset()).toEqual({ x: -1920, y: 0 })
    expect(pushOffset('right')).toEqual({ x: 1920, y: 0 })
    expect(pushOffset('up')).toEqual({ x: 0, y: -1080 })
    expect(pushOffset('down')).toEqual({ x: 0, y: 1080 })
  })
  test('an unknown direction throws, so the deck plays a fade', () => {
    expect(() => pushOffset('sideways')).toThrow('push: direction "sideways" is not left, right, up or down')
    expect(() => pushOffset('toString')).toThrow()
  })
})

describe('iris radius', () => {
  test('reaches the farthest corner of the 1920x1080 frame', () => {
    expect(irisRadius(960, 540)).toBeCloseTo(Math.hypot(960, 540))
    expect(irisRadius(0, 0)).toBeCloseTo(Math.hypot(1920, 1080))
    expect(irisRadius(1500, 200)).toBeCloseTo(Math.hypot(1500, 880))
  })
})

describe('iris hole', () => {
  test('is the frame minus a circle of radius r at (x, y), as two arcs', () => {
    expect(irisHole(300, 200, 50)).toBe('path(evenodd, "M0 0H1920V1080H0Z M250 200a50 50 0 1 0 100 0a50 50 0 1 0 -100 0Z")')
  })
})
