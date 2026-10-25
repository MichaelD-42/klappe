import { expect, test } from 'vitest'
import { NOTE_MIX, scatterIn, stickyLayout } from '../../src/fx/stickynotes'
import { fanPose } from '../../src/fx/cardstack'
import { contrast, parseTokens } from '../../src/theme'

const rect = { x: 160, y: 120, w: 1600, h: 780 }
type R = { x: number; y: number; w: number; h: number }
const inside = (a: R, b: R) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h
const apart = (a: R, b: R) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y

test('scattered notes sit inside the area below the labels, apart, and the same seed gives the same scatter', () => {
  const l = stickyLayout(rect, 10, 4, 7)
  const boxes = l.scatter.map((p) => ({ ...p, ...l.note }))
  for (const b of boxes) expect(inside(b, { ...rect, y: rect.y + 56, h: rect.h - 56 })).toBe(true)
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(apart(boxes[i], boxes[j]), `${i} ${j}`).toBe(true)
  for (const p of l.scatter) expect(Math.abs(p.rotation)).toBeLessThanOrEqual(4)
  expect(stickyLayout(rect, 10, 4, 7).scatter).toEqual(l.scatter)
  expect(stickyLayout(rect, 10, 4, 8).scatter).not.toEqual(l.scatter)
})

// After groups form, the notes left spread over the columns still free: each inside one, apart, evenly in rows.
test('notes spread over free columns sit inside them, apart, in even rows', () => {
  const { columns, note } = stickyLayout({ x: 160, y: 120, w: 1600, h: 800 }, 9, 3)
  for (const areas of [[columns[2]], [columns[0], columns[2]], [{ ...columns[1], w: columns[2].x + columns[2].w - columns[1].x }]]) {
    const poses = scatterIn(areas, [0, 2, 4, 6, 8, 7], note, 3)
    const boxes = poses.map((p) => ({ ...p, ...note }))
    for (const b of boxes) expect(areas.some((a) => inside(b, a))).toBe(true)
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) expect(apart(boxes[i], boxes[j]), `${i} ${j}`).toBe(true)
  }
  // Nine notes over the whole area: two rows of five and four, not a ragged pick of cells.
  const l = stickyLayout({ x: 160, y: 120, w: 1600, h: 800 }, 9, 3)
  const mid = 176 + 744 / 2 // the middle of the area below the label band
  const top = l.scatter.filter((p) => p.y + l.note.h / 2 < mid).length
  expect([top, 9 - top]).toEqual([5, 4])
})

test('group slots sit inside their column under its label, and no two overlap', () => {
  const { labels, slots, note } = stickyLayout(rect, 10, 4)
  expect(note.w).toBeGreaterThanOrEqual(180)
  const all = slots.flatMap((list, g) => {
    expect(list.length).toBeGreaterThanOrEqual(8)
    for (const s of list) expect(inside(s, { ...labels[g], h: rect.h }) && s.y >= labels[g].y + labels[g].h).toBe(true)
    return list
  })
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(apart(all[i], all[j]), `${i} ${j}`).toBe(true)
})

test('the fan is symmetric and at most 16 degrees each way', () => {
  expect(fanPose(0, 1)).toBe(0)
  for (const n of [2, 5, 9]) {
    expect(fanPose(0, n)).toBeCloseTo(-fanPose(n - 1, n))
    expect(Math.abs(fanPose(0, n))).toBeLessThanOrEqual(16)
  }
})

// A note is --k-series-N at NOTE_MIX over --k-bg (color-mix in srgb), with --k-fg text: 5.9:1 or more, above the 4.5:1 floor.
const themes = import.meta.glob<string>('../../src/themes/*.css', { query: '?raw', import: 'default', eager: true })
test.each(Object.entries(themes))('--k-fg stays readable on every note colour in %s', (_, css) => {
  const t = parseTokens(css)
  const rgb = (h: string) => (h.length === 4 ? [...h.slice(1)].map((c) => c + c) : [h.slice(1, 3), h.slice(3, 5), h.slice(5, 7)]).map((c) => parseInt(c, 16))
  for (let n = 1; n <= 6; n++) {
    const [a, b] = [rgb(t[`--k-series-${n}`]), rgb(t['--k-bg'])]
    const mix = `rgb(${a.map((v, i) => Math.round(v * NOTE_MIX + b[i] * (1 - NOTE_MIX))).join(', ')})`
    expect(contrast(t['--k-fg'], mix), `series ${n}`).toBeGreaterThanOrEqual(5.9)
  }
})
