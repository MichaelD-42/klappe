import { expect, test } from 'vitest'
import { flowRoutes } from '../../src/fx/flow'
import { swimlaneRoutes } from '../../src/fx/swimlanes'

type P = { x: number; y: number }
type R = { x: number; y: number; w: number; h: number }
// Whether an axis-aligned segment runs through the inside of a box.
const through = (p: P, q: P, b: R) =>
  Math.max(p.x, q.x) > b.x && Math.min(p.x, q.x) < b.x + b.w && Math.max(p.y, q.y) > b.y && Math.min(p.y, q.y) < b.y + b.h

const grid = { x: 0, y: 0, w: 1600, h: 800, cols: 4, rows: 2 }
const [cw, ch] = [grid.w / grid.cols, grid.h / grid.rows]
const cell = (col: number, row: number): R => ({ x: (col + 0.15) * cw, y: (row + 0.15) * ch, w: cw * 0.7, h: ch * 0.7 })

function clear(routes: { from: string; to: string; points: P[] }[], boxes: Record<string, R>) {
  for (const r of routes)
    for (const [id, b] of Object.entries(boxes)) {
      if (id === r.from || id === r.to) continue
      r.points.slice(1).forEach((q, i) => expect(through(r.points[i], q, b), `${r.from}->${r.to} through ${id}`).toBe(false))
    }
}

test('flow: an edge past a box in its row goes round it, not through it', () => {
  const nodes = [{ id: 'a', label: 'A', col: 0, row: 0 }, { id: 'b', label: 'B', col: 1, row: 0 }, { id: 'c', label: 'C', col: 2, row: 0 }]
  const r = flowRoutes({ nodes, edges: [{ from: 'a', to: 'c' }, { from: 'a', to: 'b' }], grid })
  clear(r, { a: cell(0, 0), b: cell(1, 0), c: cell(2, 0) })
})

test('flow: a bend whose middle run would cross a box takes another gap', () => {
  const nodes = [{ id: 'a', label: 'A', col: 0, row: 0 }, { id: 'm', label: 'M', col: 1, row: 1 }, { id: 'c', label: 'C', col: 2, row: 1 }]
  const r = flowRoutes({ nodes, edges: [{ from: 'a', to: 'c' }], grid })
  clear(r, { a: cell(0, 0), m: cell(1, 1), c: cell(2, 1) })
})

test('flow: an edge down a column past a box goes round it', () => {
  const g = { ...grid, cols: 2, rows: 3, h: 1200 }
  const nodes = [{ id: 'a', label: 'A', col: 0, row: 0 }, { id: 'b', label: 'B', col: 0, row: 1 }, { id: 'c', label: 'C', col: 0, row: 2 }]
  const r = flowRoutes({ nodes, edges: [{ from: 'a', to: 'c' }], grid: g })
  const box = (row: number): R => ({ x: 0.15 * 800, y: (row + 0.15) * 400, w: 560, h: 280 })
  clear(r, { a: box(0), b: box(1), c: box(2) })
})

test('swimlanes: a link past a task in its lane goes round it', () => {
  const lanes = [{ id: 'x', label: 'X' }, { id: 'y', label: 'Y' }]
  const tasks = [{ id: 'a', lane: 'x', col: 0, label: 'A' }, { id: 'b', lane: 'x', col: 1, label: 'B' }, { id: 'c', lane: 'x', col: 2, label: 'C' }]
  const r = swimlaneRoutes({ lanes, tasks, links: [{ from: 'a', to: 'c' }], x: 0, y: 0, w: 1600, h: 800 })
  // The layout: a 15 % label column, then 3 cells of 0.7 x 0.6 boxes, lanes 400 high.
  const c = (1600 * 0.85) / 3
  const box = (col: number): R => ({ x: 240 + (col + 0.15) * c, y: 80, w: c * 0.7, h: 240 })
  clear(r, { a: box(0), b: box(1), c: box(2) })
})
