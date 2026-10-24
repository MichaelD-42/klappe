import { expect, test } from 'vitest'
import { kpiDelta, waffleCells } from '../../src/fx/stats'

test('the change against the previous period, as a signed percentage', () => {
  expect(kpiDelta(112, 100)).toEqual({ text: '▲ 12 %', good: true })
  expect(kpiDelta(90, 100)).toEqual({ text: '▼ 10 %', good: false })
  expect(kpiDelta(100, 100)).toEqual({ text: '± 0 %', good: true })
})

test('with better "down", a fall is good: lead time, cost, defects', () => {
  expect(kpiDelta(8, 10, 'down')).toEqual({ text: '▼ 20 %', good: true })
  expect(kpiDelta(12, 10, 'down')).toEqual({ text: '▲ 20 %', good: false })
})

test('a previous value of zero has no percentage: the change is given in units', () => {
  expect(kpiDelta(5, 0)).toEqual({ text: '▲ 5', good: true })
})

test('a waffle fills one cell per percent, rounded, never below 0 or above 100', () => {
  expect(waffleCells(37, 100)).toBe(37)
  expect(waffleCells(1, 3)).toBe(33)
  expect(waffleCells(-4, 100)).toBe(0)
  expect(waffleCells(130, 100)).toBe(100)
})
