import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// The fixture's one over-long label is its only problem.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and swimlanes text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-swimlanes`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/20-direct/scene.ts step 3: swimlanes: no link from "order" to "notify"',
      'sections/10-a/30-long/scene.ts step 1: swimlanes: label of "x" too long',
    ])
  })
