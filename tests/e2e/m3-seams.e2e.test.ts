import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// The four Markdown parts in plain scene.md files: the walk passes and the only problem is the unbundled fence language.
test('walk: m3-seams passes with only the cobol problem', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=m3-seams`, { w: 1920, h: 1080 })
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems).toHaveLength(1)
  expect(r.problems[0]).toContain('language "cobol" not bundled; shown plain')
})
