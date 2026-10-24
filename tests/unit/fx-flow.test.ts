import { expect, test } from 'vitest'
import { edgePath, flow, flowRoutes } from '../../src/fx/flow'

const box = (x: number, y: number) => ({ x, y, w: 100, h: 60 })

test('the same row is one straight line between the facing edges', () => {
  expect(edgePath(box(0, 0), box(300, 0))).toBe('M 100 30 L 300 30')
  expect(edgePath(box(300, 0), box(0, 0))).toBe('M 300 30 L 100 30')
})

test('the same column is one vertical line', () => {
  expect(edgePath(box(0, 0), box(0, 200))).toBe('M 50 60 L 50 200')
})

test('a diagonal goes horizontal, vertical, horizontal through the gap midpoint', () => {
  expect(edgePath(box(0, 0), box(300, 200))).toBe('M 100 30 L 200 30 L 200 230 L 300 230')
  expect(edgePath(box(300, 200), box(0, 0))).toBe('M 300 230 L 200 230 L 200 30 L 100 30')
})

test('an unknown node id in edges throws', () => {
  const ctx: any = {}
  const grid = { x: 0, y: 0, w: 400, h: 200, cols: 2, rows: 1 }
  expect(() => flow(ctx, { nodes: [{ id: 'a', label: 'A', col: 0, row: 0 }], edges: [{ from: 'a', to: 'zz' }], grid })).toThrow('flow: unknown node "zz"')
})

// The demo catalog's and fixture's edge set: one straight edge, one bend down, one bend up into a shared target, one skip.
const nodes = [
  { id: 'web', label: 'Web app', col: 0, row: 0 },
  { id: 'api', label: 'API', col: 1, row: 0 },
  { id: 'queue', label: 'Queue', col: 2, row: 1 },
  { id: 'db', label: 'Database', col: 3, row: 0 },
]
const edges = [
  { from: 'web', to: 'api' },
  { from: 'api', to: 'queue' },
  { from: 'queue', to: 'db' },
  { from: 'api', to: 'db' },
]

type P = { x: number; y: number }
const segs = (pts: P[]) => pts.slice(1).map((q, i) => [pts[i], q] as const)
// Two axis-aligned segments overlap when collinear and their spans share more than a point.
function overlap([a, b]: readonly [P, P], [c, d]: readonly [P, P]): boolean {
  if (a.y === b.y && c.y === d.y && a.y === c.y) return Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) > Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
  if (a.x === b.x && c.x === d.x && a.x === c.x) return Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) > Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
  return false
}

test('no two edges share a segment or an end point', () => {
  const r = flowRoutes({ nodes, edges, grid: { x: 160, y: 140, w: 1600, h: 760, cols: 4, rows: 2 } })
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const [p, q] = [r[i].points, r[j].points]
      expect(p[p.length - 1], `ends ${i} ${j}`).not.toEqual(q[q.length - 1])
      expect(p[0], `starts ${i} ${j}`).not.toEqual(q[0])
      for (const s of segs(p)) for (const t of segs(q)) expect(overlap(s, t), `edges ${i} and ${j}`).toBe(false)
    }
})

test('send reports a path under 2 nodes, a missing edge and a backward edge', () => {
  const problems: string[] = []
  const el = () => ({ append() {}, setAttribute() {}, style: {}, appendChild: (c: unknown) => c })
  ;(globalThis as any).document = { createElement: el, createElementNS: el }
  const ctx: any = { svg: el(), html: el(), problem: (m: string) => problems.push(m) }
  const grid = { x: 0, y: 0, w: 1600, h: 760, cols: 4, rows: 2 }
  try {
    flow(ctx, { nodes, edges, grid }).send({ path: ['web'] })
    flow(ctx, { nodes, edges, grid }).send({ path: ['web', 'db'] })
    flow(ctx, { nodes, edges, grid }).send({ path: ['api', 'web'] })
  } finally {
    delete (globalThis as any).document
  }
  expect(problems).toEqual([
    'flow: send needs a path of at least 2 nodes',
    'flow: no edge from "web" to "db"',
    'flow: edge between "api" and "web" runs from "web" to "api"',
  ])
})
