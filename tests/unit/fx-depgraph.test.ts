import { expect, test } from 'vitest'
import { depLayout, depReach } from '../../src/fx/depgraph'

const rect = { x: 0, y: 0, w: 1600, h: 800 }
const nodes = ['web', 'mobile', 'api', 'auth', 'db', 'cache'].map((id) => ({ id, label: id }))
// from depends on to
const links = [
  { from: 'web', to: 'api' },
  { from: 'mobile', to: 'api' },
  { from: 'api', to: 'auth' },
  { from: 'api', to: 'db' },
  { from: 'auth', to: 'db' },
  { from: 'api', to: 'cache' },
]

test('a node sits one column right of the furthest node that depends on it', () => {
  const l = depLayout({ nodes, links, ...rect })
  expect(l.problems).toEqual([])
  const col = Object.fromEntries(l.nodes.map((n) => [n.id, n.col]))
  expect(col).toEqual({ web: 0, mobile: 0, api: 1, auth: 2, cache: 2, db: 3 })
  // Columns run left to right; within a column, boxes do not overlap.
  for (const a of l.nodes)
    for (const b of l.nodes) {
      if (a === b) continue
      if (a.col < b.col) expect(a.x + a.w).toBeLessThan(b.x)
      if (a.col === b.col) expect(a.y + a.h <= b.y || b.y + b.h <= a.y).toBe(true)
    }
})

test('a link that skips a column runs through a slot of its own there, clear of the boxes', () => {
  const l = depLayout({ nodes, links, ...rect })
  const k = links.findIndex((x) => x.from === 'api' && x.to === 'db')
  expect(l.via[k]).toHaveLength(1)
  const v = l.via[k][0]
  for (const n of l.nodes.filter((n) => n.col === 2)) expect(v.y < n.y || v.y > n.y + n.h).toBe(true)
  expect(l.via.filter((_, i) => i !== k && links[i].from !== 'auth').every((p) => !p.length)).toBe(true)
})

test('the same input gives the same layout', () => {
  expect(depLayout({ nodes, links, ...rect })).toEqual(depLayout({ nodes, links, ...rect }))
})

test('reach goes hop by hop: down to what a node depends on, up to what depends on it', () => {
  expect(depReach(links, 'api')).toEqual([['api'], ['auth', 'db', 'cache']])
  expect(depReach(links, 'db', true)).toEqual([['db'], ['api', 'auth'], ['web', 'mobile']])
})

test('a cycle and an unknown node are problems', () => {
  const l = depLayout({ nodes: nodes.slice(0, 3), links: [{ from: 'web', to: 'api' }, { from: 'api', to: 'web' }, { from: 'api', to: 'zz' }], ...rect })
  expect(l.problems).toEqual(['depGraph: no node "zz"', 'depGraph: a cycle through "web", "api"; a dependency graph has none'])
})
