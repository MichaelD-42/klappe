import { expect, test } from 'vitest'
import { gitLayout, type GitOp } from '../../src/fx/gitgraph'

const rect = { x: 100, y: 100, w: 1700, h: 600 }
const base: GitOp[] = [
  { commit: 'main', label: 'init' },
  { branch: 'feature', from: 'main' },
  { commit: 'feature', label: 'form' },
  { commit: 'main', label: 'fix' },
]

test('commits run left to right in the order they are made, one lane per branch', () => {
  const l = gitLayout(base, rect)
  expect(l.problems).toEqual([])
  expect(l.lanes.map((x) => x.name)).toEqual(['main', 'feature'])
  expect(l.commits.map((c) => [c.label, c.lane, c.parents])).toEqual([
    ['init', 0, []],
    ['form', 1, ['c0']],
    ['fix', 0, ['c0']],
  ])
  const xs = l.commits.map((c) => c.x)
  expect([...xs].sort((a, b) => a - b)).toEqual(xs)
  expect(l.commits[1].y).toBeGreaterThan(l.commits[0].y)
  // A new branch rings the commit it starts from; a commit rings itself.
  expect(l.lit).toEqual([['c0'], ['c0'], ['c1'], ['c2']])
})

test('a merge is a commit on the target with both tips as parents', () => {
  const l = gitLayout([...base, { merge: 'feature', into: 'main' }], rect)
  expect(l.commits.at(-1)).toMatchObject({ label: 'merge feature', lane: 0, parents: ['c2', 'c1'] })
})

test("a rebase replays the branch's own commits after the target's tip and retires the originals", () => {
  const l = gitLayout([...base, { commit: 'feature', label: 'test' }, { rebase: 'feature', onto: 'main' }], rect)
  expect(l.problems).toEqual([])
  const [form, test2] = [l.commits[1], l.commits[3]]
  expect([form.gone, test2.gone]).toEqual([5, 5])
  const copies = l.commits.filter((c) => c.op === 5)
  expect(copies.map((c) => [c.label, c.lane, c.parents, c.copyOf])).toEqual([
    ['form′', 1, ['c2'], 'c1'],
    ['test′', 1, ['c4'], 'c3'],
  ])
  expect(Math.min(...copies.map((c) => c.x))).toBeGreaterThan(l.commits[2].x)
  expect(l.lit[5]).toEqual(copies.map((c) => c.id))
})

test('unknown branches, a repeat branch, an empty rebase and too much history are problems', () => {
  expect(gitLayout([{ commit: 'main', label: 'a' }, { commit: 'dev', label: 'b' }], rect).problems).toEqual(['gitGraph: no branch "dev"'])
  expect(gitLayout([{ commit: 'main', label: 'a' }, { branch: 'main', from: 'main' }], rect).problems).toEqual(['gitGraph: branch "main" already exists'])
  expect(gitLayout([...base, { merge: 'feature', into: 'main' }, { rebase: 'feature', onto: 'main' }], rect).problems).toEqual([
    'gitGraph: rebase of "feature" onto "main" has nothing to replay',
  ])
  const many: GitOp[] = Array.from({ length: 20 }, (_, i) => ({ commit: 'main', label: `${i}` }))
  expect(gitLayout(many, rect).problems).toEqual(['gitGraph: 20 commits do not fit in 1700px'])
  const wide: GitOp[] = [{ commit: 'main', label: 'a' }, ...Array.from({ length: 6 }, (_, i) => ({ branch: `b${i}`, from: 'main' }))]
  expect(gitLayout(wide, rect).problems).toEqual(['gitGraph: 7 branches; at most 6', 'gitGraph: 7 branches do not fit in 600px'])
})
