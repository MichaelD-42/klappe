import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// Three text-only scenes in a row and three big-number scenes in a row: one look warning each, nothing failing.
test('the walk warns about runs of scenes with one look', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=monotony`)
  expect(r.errors).toEqual([])
  expect(r.problems).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.warnings.filter((w) => w.startsWith('monotony'))).toEqual([
    'monotony: 3 scenes in a row are text only: a/one, a/two, a/three',
    'monotony: 3 scenes in a row are layout big-number: a/b1, a/b2, a/b3',
  ])
}, 120_000)

// Three default titles and one 10 px to the right: the walk names that one.
test('the walk warns about a title a few px off where the other scenes put theirs', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=layout-grid`)
  expect(r.problems).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.warnings.filter((w) => w.startsWith('layout grid'))).toEqual(['layout grid: the title of a/off sits at x 170, 10 px off the 160 that 3 scenes use'])
}, 120_000)
