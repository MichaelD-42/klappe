import { expect, test } from 'vitest'
import { roadmapLayout } from '../../src/fx/roadmap'

const milestones = [
  { id: 'beta', date: '2026-09-15', label: 'Beta' },
  { id: 'kick', date: '2026-07-01', label: 'Kick-off' },
  { id: 'ga', date: '2026-12-01', label: 'Launch' },
]
const base = { x: 160, w: 1600, milestones, today: '2026-08-10' }

test('the axis spans whole months around the milestones and today', () => {
  const L = roadmapLayout(base)
  expect(new Date(L.start).toISOString().slice(0, 10)).toBe('2026-07-01')
  expect(new Date(L.end).toISOString().slice(0, 10)).toBe('2027-01-01')
  expect(L.px(L.start)).toBe(160)
  expect(L.px(L.end)).toBe(1760)
  expect(L.ticks.map((t) => t.label)).toEqual(['Jul 2026', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan 2027'])
  expect(L.today).toBeGreaterThan(L.ticks[1].x)
  expect(L.today).toBeLessThan(L.ticks[2].x)
  expect(L.problems).toEqual([])
})

test('milestones go in date order, alternating above and below, each label centred on its dot', () => {
  const L = roadmapLayout(base)
  expect(L.milestones.map((m) => [m.id, m.above])).toEqual([['kick', true], ['beta', false], ['ga', true]])
  for (const m of L.milestones) expect(m.left + m.width / 2).toBeCloseTo(m.x, 1)
  expect(L.milestones[0]).toMatchObject({ x: 160, width: 300 })
})

test('dates and ticks follow the deck language, in UTC', () => {
  const L = roadmapLayout(base, 'de')
  expect(L.ticks[0].label).toBe('Juli 2026')
  expect(L.milestones[0].date).toBe('1. Juli')
})

test('a long span thins the ticks out', () => {
  const L = roadmapLayout({ ...base, w: 800, today: '2025-01-10' })
  const gaps = L.ticks.slice(1).map((t, i) => t.x - L.ticks[i].x)
  for (const g of gaps) expect(g).toBeGreaterThanOrEqual(120)
})

test('two labels too close on one side are a problem; a bad date throws', () => {
  const close = [...milestones, { id: 'rc', date: '2026-07-03', label: 'RC' }, { id: 'x', date: '2026-07-02', label: 'X' }]
  expect(roadmapLayout({ ...base, milestones: close }).problems).toContain('roadmap: milestones "kick" and "rc" are too close')
  expect(() => roadmapLayout({ ...base, today: '2026-02-30' })).toThrow('roadmap: date "2026-02-30" is not YYYY-MM-DD')
})

test('a milestone with an empty label is a dot: out of the spacing, and the labelled ones alternate among themselves', () => {
  const dots = ['2026-07-02', '2026-07-02', '2026-07-03', '2026-09-14'].map((date, i) => ({ id: `d${i}`, date, label: '' }))
  const L = roadmapLayout({ ...base, milestones: [...milestones, ...dots] })
  expect(L.problems).toEqual([])
  expect(L.milestones.map((m) => [m.id, m.dot])).toEqual([['kick', false], ['d0', true], ['d1', true], ['d2', true], ['d3', true], ['beta', false], ['ga', false]])
  expect(L.milestones.filter((m) => !m.dot).map((m) => [m.id, m.above])).toEqual([['kick', true], ['beta', false], ['ga', true]])
  expect(L.milestones[0]).toMatchObject({ x: 160, width: 300 }) // a dot beside it does not narrow its label
  expect(L.milestones[1]).toMatchObject({ x: L.milestones[2].x, label: '', date: '' })
})

test('a span of years puts a tick on every January, with its year, and the year in each milestone date', () => {
  const L = roadmapLayout({ x: 160, w: 1600, milestones: [{ id: 'a', date: '2020-03-10', label: 'A' }], today: '2026-10-27' })
  expect(L.ticks.map((t) => t.label)).toEqual(['Jul 2020', 'Jan 2021', 'Jul', 'Jan 2022', 'Jul', 'Jan 2023', 'Jul', 'Jan 2024', 'Jul', 'Jan 2025', 'Jul', 'Jan 2026', 'Jul'])
  expect(L.milestones[0].date).toBe('Mar 10, 2020')
  expect(roadmapLayout(base).milestones[0].date).toBe('Jul 1')
})

const phases = [
  { id: 'build', from: '2026-07-01', to: '2026-09-15', label: 'Build' },
  { id: 'pilot', from: '2026-09-01', to: '2026-11-30', label: 'Pilot' }, // overlaps build: a second lane
  { id: 'roll', from: '2026-10-01', to: '2027-02-28', label: 'Roll-out' }, // after build: back in the first lane
]

test('phases sit in lanes under the axis, a phase that overlaps another in the next lane; the axis reaches them', () => {
  const L = roadmapLayout({ ...base, phases })
  expect(L.phases.map((p) => [p.id, p.lane])).toEqual([['build', 0], ['pilot', 1], ['roll', 0]])
  expect(L.phases[0].left).toBe(L.px(Date.UTC(2026, 6, 1)))
  // Through the end of its last day, 15 September.
  expect(L.phases[0].width).toBeCloseTo(L.px(Date.UTC(2026, 8, 16)) - L.px(Date.UTC(2026, 6, 1)))
  expect(new Date(L.end).toISOString().slice(0, 10)).toBe('2027-03-01')
})

test('with phases every milestone sits above the axis, and only same-side neighbours count as close', () => {
  const L = roadmapLayout({ ...base, phases })
  expect(L.milestones.every((m) => m.above)).toBe(true)
})

test('a phase that ends before it starts throws', () => {
  expect(() => roadmapLayout({ ...base, phases: [{ id: 'x', from: '2026-09-01', to: '2026-08-01', label: 'X' }] })).toThrow('roadmap: phase "x" ends before it starts')
})
