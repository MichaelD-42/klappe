import { expect, test } from 'vitest'
import { cloudLayout, type PlacedWord } from '../../src/fx/wordcloud'

const rect = { x: 160, y: 80, w: 1600, h: 840 }
const words = ['Trust', 'Speed', 'Quality', 'Focus', 'Ownership', 'Feedback', 'Learning', 'Safety', 'Clarity', 'Customer', 'Craft', 'Flow', 'Data', 'Team', 'Kaizen', 'Respect', 'Courage', 'Pace']
  .map((text, i) => ({ text, weight: 40 - i * 2 }))
const overlaps = (p: PlacedWord[]) =>
  p.flatMap((a, i) => p.slice(i + 1).filter((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h).map((b) => [a.text, b.text]))
const inside = (p: PlacedWord, r = rect) => p.x >= r.x && p.y >= r.y && p.x + p.w <= r.x + r.w && p.y + p.h <= r.y + r.h

test('every word is placed, heaviest first and largest, inside the rect, with no two boxes touching', () => {
  const p = cloudLayout(words, rect)
  expect(p.map((w) => w.text)).toEqual(words.map((w) => w.text))
  expect(p.every((w) => inside(w))).toBe(true)
  expect(overlaps(p)).toEqual([])
  expect(p[0].size).toBeGreaterThan(p[p.length - 1].size)
  // The heaviest word sits on the centre of the rect.
  expect(p[0].x + p[0].w / 2).toBeCloseTo(960)
  expect(p[0].y + p[0].h / 2).toBeCloseTo(500)
})

test('the same words give the same layout; heaviest first whatever the input order; ties keep input order', () => {
  expect(cloudLayout(words, rect)).toEqual(cloudLayout(words, rect))
  expect(cloudLayout([...words].reverse(), rect).map((w) => w.text)).toEqual(words.map((w) => w.text))
  expect(cloudLayout([{ text: 'a', weight: 1 }, { text: 'b', weight: 1 }], rect).map((w) => w.text)).toEqual(['a', 'b'])
})

test('too many words for the rect: sizes shrink until they fit, still without overlap', () => {
  const small = { x: 0, y: 0, w: 800, h: 400 }
  const p = cloudLayout(words, small, 160)
  expect(p).toHaveLength(words.length)
  expect(p[0].size).toBeLessThan(160)
  expect(p.every((w) => inside(w, small))).toBe(true)
  expect(overlaps(p)).toEqual([])
})

test('a rect too small for every word leaves words out instead of overlapping them', () => {
  const p = cloudLayout(words, { x: 0, y: 0, w: 300, h: 60 })
  expect(p.length).toBeLessThan(words.length)
  expect(overlaps(p)).toEqual([])
})
