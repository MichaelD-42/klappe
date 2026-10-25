import { expect, test } from 'vitest'
import { gaugeAngle, likertShares } from '../../src/fx/stats'

test('the needle points left at min, up halfway, right at max, and never off the dial', () => {
  expect(gaugeAngle(0, 0, 100)).toBe(-90)
  expect(gaugeAngle(50, 0, 100)).toBe(0)
  expect(gaugeAngle(100, 0, 100)).toBe(90)
  expect(gaugeAngle(15, 10, 20)).toBe(0)
  expect(gaugeAngle(-5, 0, 100)).toBe(-90)
  expect(gaugeAngle(130, 0, 100)).toBe(90)
})

test('a Likert row as shares of its answers; nobody answered is all zero', () => {
  expect(likertShares([1, 1, 2, 4, 2])).toEqual([0.1, 0.1, 0.2, 0.4, 0.2])
  expect(likertShares([0, 0, 0, 1, 0])).toEqual([0, 0, 0, 1, 0])
  expect(likertShares([0, 0, 0, 0, 0])).toEqual([0, 0, 0, 0, 0])
})
