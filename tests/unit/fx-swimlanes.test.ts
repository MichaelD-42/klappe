import { expect, test } from 'vitest'
import { swimlanes, swimlaneRoutes } from '../../src/fx/swimlanes'

const lanes = [{ id: 'cust', label: 'Customer' }, { id: 'sales', label: 'Sales' }, { id: 'ops', label: 'Operations' }]
const tasks = [
  { id: 'order', lane: 'cust', col: 0, label: 'Place order' },
  { id: 'check', lane: 'sales', col: 1, label: 'Check order' },
  { id: 'approve', lane: 'sales', col: 2, label: 'Approve' },
  { id: 'pack', lane: 'ops', col: 2, label: 'Pack and ship' },
  { id: 'notify', lane: 'cust', col: 3, label: 'Get confirmation' },
]
const links = [
  { from: 'order', to: 'check' },
  { from: 'check', to: 'approve' },
  { from: 'approve', to: 'pack' },
  { from: 'approve', to: 'notify' },
  { from: 'pack', to: 'notify' },
]
const rect = { x: 160, y: 140, w: 1600, h: 760 }

type P = { x: number; y: number }
const segs = (pts: P[]) => pts.slice(1).map((q, i) => [pts[i], q] as const)
function overlap([a, b]: readonly [P, P], [c, d]: readonly [P, P]): boolean {
  if (a.y === b.y && c.y === d.y && a.y === c.y) return Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) > Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
  if (a.x === b.x && c.x === d.x && a.x === c.x) return Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) > Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
  return false
}

test('no two links share a segment or an end point', () => {
  const r = swimlaneRoutes({ lanes, tasks, links, ...rect })
  expect(r).toHaveLength(links.length)
  for (let i = 0; i < r.length; i++)
    for (let j = i + 1; j < r.length; j++) {
      const [p, q] = [r[i].points, r[j].points]
      expect(p[p.length - 1], `ends ${i} ${j}`).not.toEqual(q[q.length - 1])
      expect(p[0], `starts ${i} ${j}`).not.toEqual(q[0])
      for (const s of segs(p)) for (const t of segs(q)) expect(overlap(s, t), `links ${i} and ${j}`).toBe(false)
    }
})

test('an unknown lane or task id throws at build', () => {
  const ctx: any = {}
  expect(() => swimlanes(ctx, { lanes, tasks: [{ id: 'a', lane: 'zz', col: 0, label: 'A' }], links: [], ...rect })).toThrow('swimlanes: unknown lane "zz"')
  expect(() => swimlanes(ctx, { lanes, tasks, links: [{ from: 'order', to: 'zz' }], ...rect })).toThrow('swimlanes: unknown task "zz"')
})
