import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// Review focus 4: play and deep link agree at every step, and text stays legible off 16:9.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
]) {
  test(`walk passes at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk`, vp)
    expect(r.problems).toEqual([])
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBeGreaterThan(0)
    expect(r.ok).toBe(true)
  })
}

// Review focus 3: a step-count mismatch must fail the self-test and name the file.
test('walk fails on a deck whose scene.ts and scene.md disagree', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=broken-step-count`)
  expect(r.ok).toBe(false)
  expect(r.problems.some((p) => p.includes('scene.ts'))).toBe(true)
  expect(r.steps).toBeGreaterThan(0)
})
