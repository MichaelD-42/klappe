import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

for (const fixture of ['fx-shout', 'fx-shout-bold'])
  for (const vp of [
    { w: 1920, h: 1080 },
    { w: 1366, h: 768 },
    { w: 1024, h: 768 },
  ])
    test(`${fixture} walks clean at ${vp.w}x${vp.h}`, async () => {
      const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=${fixture}`, vp)
      expect(r.errors).toEqual([])
      expect(r.problems).toEqual([])
      expect(r.checks.filter((c) => !c.ok)).toEqual([])
      expect(r.ok).toBe(true)
    })
