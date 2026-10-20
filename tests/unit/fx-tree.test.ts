import { expect, test } from 'vitest'
import { decisionTree, treeLayout, treeRoute, type TreeNode } from '../../src/fx/tree'

const leaf = (label: string): TreeNode => ({ label })
const tree: TreeNode = {
  label: 'Bug?',
  children: [
    { edge: 'yes', node: { label: 'Repro?', children: [{ edge: 'yes', node: leaf('Fix') }, { edge: 'no', node: leaf('Ask') }] } },
    { edge: 'no', node: leaf('Ignore') },
  ],
}
const rect = { x: 100, y: 50, w: 1000, h: 600 }

test('route follows the edge labels and gives the node ids', () => {
  expect(treeRoute(tree, ['yes', 'no']).ids).toEqual(['n0', 'n1', 'n4'])
  expect(treeRoute(tree, []).ids).toEqual(['n0'])
})

test('a label that is not on the route is reported with the node it follows', () => {
  expect(treeRoute(tree, ['yes', 'maybe'])).toEqual({ ids: ['n0', 'n1'], error: 'tree: no edge "maybe" after "Repro?"' })
})

test('layout of a 3-level tree: siblings spaced by d3.tree, levels evenly spaced', () => {
  const { boxes, problem } = treeLayout(tree, rect)
  expect(problem).toBeUndefined()
  const by = Object.fromEntries(boxes.map((b) => [b.label, b]))
  expect(boxes.map((b) => b.id)).toEqual(['n0', 'n1', 'n2', 'n3', 'n4'])
  expect([by['Bug?'].w, by['Bug?'].h]).toEqual([280, 88])
  expect(by['Bug?'].y).toBe(50)
  expect(by['Repro?'].y).toBe(50 + 256)
  expect(by.Fix.y).toBe(50 + 512)
  const cx = (l: string) => by[l].x + by[l].w / 2
  expect(cx('Fix')).toBe(240)
  expect(cx('Ask')).toBe(720)
  expect(cx('Ignore')).toBe(960)
  expect(cx('Bug?')).toBeCloseTo((cx('Repro?') + cx('Ignore')) / 2, 0)
  expect(by.Fix.parent).toBe('n1')
  expect(by.Fix.edge).toBe('yes')
})

test('boxes on one level never overlap', () => {
  const wide: TreeNode = { label: 'r', children: Array.from({ length: 6 }, (_, i) => ({ edge: `e${i}`, node: leaf(`l${i}`) })) }
  const { boxes } = treeLayout(wide, { x: 0, y: 0, w: 1600, h: 400 })
  const ls = boxes.filter((b) => b.depth === 1).sort((a, b) => a.x - b.x)
  ls.slice(1).forEach((b, i) => expect(b.x).toBeGreaterThanOrEqual(ls[i].x + ls[i].w))
})

test('a tree too wide for its width is a problem with no boxes', () => {
  const wide: TreeNode = { label: 'r', children: Array.from({ length: 20 }, (_, i) => ({ edge: `e${i}`, node: leaf(`l${i}`) })) }
  const r = treeLayout(wide, { x: 0, y: 0, w: 1600, h: 400 })
  expect(r.boxes).toEqual([])
  expect(r.problem).toBe('tree: too wide for 1600px at 20px text')
})

test('a tree too deep for its height is a problem', () => {
  let n: TreeNode = leaf('end')
  for (let i = 0; i < 6; i++) n = { label: `n${i}`, children: [{ edge: 'x', node: n }] }
  expect(treeLayout(n, { x: 0, y: 0, w: 1600, h: 600 }).problem).toBe('tree: too deep for 600px')
})

test('an oversize tree reports through ctx.problem and draws nothing', () => {
  const problems: string[] = []
  const el = () => ({ append() {}, setAttribute() {}, style: {}, appendChild: (c: unknown) => c })
  ;(globalThis as any).document = { createElement: el, createElementNS: el }
  const ctx: any = { svg: el(), html: el(), problem: (m: string) => problems.push(m) }
  const wide: TreeNode = { label: 'r', children: Array.from({ length: 20 }, (_, i) => ({ edge: `e${i}`, node: leaf(`l${i}`) })) }
  try {
    decisionTree(ctx, { root: wide, x: 0, y: 0, w: 1600, h: 400 })
  } finally {
    delete (globalThis as any).document
  }
  expect(problems).toEqual(['tree: too wide for 1600px at 20px text'])
})
