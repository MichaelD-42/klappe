import { expect, test } from 'vitest'
import { calendarLayout, calendarSpan } from '../../src/fx/calendar'

const rect = { x: 160, y: 100, w: 1400, h: 760 }

test('a month in weeks: November 2026 starts on a Sunday, so with Monday first it takes six rows', () => {
  const l = calendarLayout('2026-11', 1, rect)
  expect(l.problems).toEqual([])
  expect(l.days).toHaveLength(30)
  const at = (d: string) => l.days.find((c) => c.date === d)!
  expect([at('2026-11-01').col, at('2026-11-01').row]).toEqual([6, 0])
  expect([at('2026-11-02').col, at('2026-11-02').row]).toEqual([0, 1])
  expect([at('2026-11-30').col, at('2026-11-30').row]).toEqual([0, 5])
  expect(l.rows).toBe(6)
  // Sunday first: the 1st opens the first row.
  const s = calendarLayout('2026-11', 0, rect)
  expect([s.days[0].col, s.days[0].row]).toEqual([0, 0])
  expect(s.rows).toBe(5)
  // The cells fill the rect below the title and weekday bands.
  expect(at('2026-11-30').y + at('2026-11-30').h).toBeCloseTo(rect.y + rect.h)
  expect(at('2026-11-01').x + at('2026-11-01').w).toBeCloseTo(rect.x + rect.w)
})

test('a span breaks into one bar per week it covers', () => {
  const l = calendarLayout('2026-11', 1, rect)
  const bars = calendarSpan(l, '2026-11-05', '2026-11-17')
  expect(bars.map((b) => [b.row, b.from, b.to])).toEqual([[1, 3, 6], [2, 0, 6], [3, 0, 1]])
})

test('a month that is not YYYY-MM and a rect too small are problems', () => {
  expect(calendarLayout('Nov 2026', 1, rect).problems).toEqual(['calendar: month "Nov 2026" is not YYYY-MM'])
  expect(calendarLayout('2026-11', 1, { ...rect, w: 400 }).problems).toEqual(['calendar: a 400px wide grid has days under 80px; widen the rect'])
})
