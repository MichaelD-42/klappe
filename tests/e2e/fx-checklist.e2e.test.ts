import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// The fixture causes exactly two problems: a tick of a missing item and a list too tall for its rect.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and checklist text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-checklist`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['checklist: no item 7', 'checklist: 30 items do not fit 600px at 20px text'])
  })
