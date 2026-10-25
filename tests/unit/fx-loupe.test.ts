import { expect, test } from 'vitest'
import { loupeOffset } from '../../src/fx/loupe'

const rect = { x: 160, y: 90, w: 1600, h: 900 }

test('the point under the lens centre shows at the centre of the lens, enlarged', () => {
  const r = 150
  const zoom = 2
  const p = { x: 560, y: 390 }
  const o = loupeOffset(p, rect, r, zoom)
  // The copy is the picture scaled by zoom from its top-left; p sits at (p - rect) * zoom in it.
  expect([o.x + (p.x - rect.x) * zoom, o.y + (p.y - rect.y) * zoom]).toEqual([r, r])
})

test('at the picture corner the copy starts at the lens centre; zoom 1 is a plain window', () => {
  expect(loupeOffset({ x: 160, y: 90 }, rect, 100, 3)).toEqual({ x: 100, y: 100 })
  expect(loupeOffset({ x: 460, y: 290 }, rect, 100, 1)).toEqual({ x: -200, y: -100 })
})
