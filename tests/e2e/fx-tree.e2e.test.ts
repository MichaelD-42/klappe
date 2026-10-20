import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// The fixture causes exactly two problems: a path edge that is not there and a tree too wide.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and tree text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-tree`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['tree: too wide for 1600px at 20px text', 'tree: no edge "maybe" after "Can you repeat it?"'])
  })
