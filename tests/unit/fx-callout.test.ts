import { expect, test } from 'vitest'
import { anchor, labelPos } from '../../src/fx/callout'

const box = { x: 100, y: 200, w: 80, h: 40 }

test('the leader leaves the box edge midpoint on each side and ends offset further out', () => {
  expect(anchor(box, 'left', 50)).toEqual({ from: { x: 100, y: 220 }, to: { x: 50, y: 220 } })
  expect(anchor(box, 'right', 50)).toEqual({ from: { x: 180, y: 220 }, to: { x: 230, y: 220 } })
  expect(anchor(box, 'top', 50)).toEqual({ from: { x: 140, y: 200 }, to: { x: 140, y: 150 } })
  expect(anchor(box, 'bottom', 50)).toEqual({ from: { x: 140, y: 240 }, to: { x: 140, y: 290 } })
})

test('the offset defaults to 120 and a point is a box of no size', () => {
  expect(anchor({ x: 10, y: 10, w: 0, h: 0 }, 'right').to).toEqual({ x: 130, y: 10 })
})

test('the label sits with its near edge midpoint on the leader end', () => {
  const to = { x: 500, y: 300 }
  expect(labelPos(to, 'left', 200, 60)).toEqual({ x: 300, y: 270 })
  expect(labelPos(to, 'right', 200, 60)).toEqual({ x: 500, y: 270 })
  expect(labelPos(to, 'top', 200, 60)).toEqual({ x: 400, y: 240 })
  expect(labelPos(to, 'bottom', 200, 60)).toEqual({ x: 400, y: 300 })
})
