import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// The fixture causes exactly two problems: an unknown current row and too many rows.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and agenda text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-agenda`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['agenda: no row "Nope"', 'agenda: 24 rows do not fit 600px at 20px text'])
  })
