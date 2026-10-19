import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

const walk = (fixture: string, vp = { w: 1366, h: 768 }) =>
  runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=${fixture}`, vp)

// Review focus 1: text written from onUpdate is part of the snapshot.
test('walk passes when onUpdate writes data-k-text from progress', async () => {
  const r = await walk('k-text')
  expect(r.errors).toEqual([])
  expect(r.problems).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.ok).toBe(true)
})

test('walk fails when onUpdate writes wall-clock time into data-k-text', async () => {
  const r = await walk('k-text-clock')
  expect(r.ok).toBe(false)
  expect(r.checks.find((c) => !c.ok)?.detail).toContain('text=')
})

// Review focus 5: the default media layout stays legible and inside the frame.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`media layout is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await walk('media-layout', vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBe(4)
  })

test('walk passes across a blackout and a cut transition', async () => {
  const r = await walk('blackout')
  expect(r.errors).toEqual([])
  expect(r.problems).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.steps).toBe(3)
  expect(r.ok).toBe(true)
})
