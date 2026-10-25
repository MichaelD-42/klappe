import { expect, test } from 'vitest'
import { wordDiff } from '../../src/fx/redline'
import { flapGlyphs } from '../../src/fx/splitflap'

test('wordDiff keeps the shared words, deletes before it adds at a fork, and splits on any whitespace', () => {
  expect(wordDiff('We ship  every month.', 'We ship\nevery week.')).toEqual([
    { op: 'keep', word: 'We' },
    { op: 'keep', word: 'ship' },
    { op: 'keep', word: 'every' },
    { op: 'del', word: 'month.' },
    { op: 'add', word: 'week.' },
  ])
  expect(wordDiff('', 'new text').map((o) => o.op)).toEqual(['add', 'add'])
  expect(wordDiff('old text', '').map((o) => o.op)).toEqual(['del', 'del'])
  expect(wordDiff('a b c', 'a c').map((o) => `${o.op}:${o.word}`)).toEqual(['keep:a', 'del:b', 'keep:c'])
})

test('flapGlyphs gives the old text at p = 0 and the new one at p = 1, upper-cased and padded to the cells', () => {
  expect(flapGlyphs('gate a1', 'Delayed', 0, 8).join('')).toBe('GATE A1 ')
  expect(flapGlyphs('gate a1', 'Delayed', 1, 8).join('')).toBe('DELAYED ')
  expect(flapGlyphs('abc', 'toolong', 1, 4).join('')).toBe('TOOL')
})

test('each cell steps forward through the drum; the left cells lead', () => {
  // A to E is four flips forward; mid-way the first cell is at least as far on as the last.
  const mid = flapGlyphs('AAAA', 'EEEE', 0.3, 4)
  expect(mid[0] >= mid[3]).toBe(true)
  expect(mid[0]).not.toBe('A')
  expect(mid.every((c) => 'ABCDE'.includes(c))).toBe(true)
  // Forward only: Z to A wraps through the digits and marks, never back through Y.
  const seen = new Set(Array.from({ length: 101 }, (_, k) => flapGlyphs('Z', 'A', k / 100, 1)[0]))
  expect(seen.has('Y')).toBe(false)
  expect(seen.has('0')).toBe(true)
})

test('a character not on the drum changes in one flip at the end; an unchanged cell never flips', () => {
  expect(flapGlyphs('#', 'A', 0.99, 1)).toEqual(['#'])
  expect(flapGlyphs('#', 'A', 1, 1)).toEqual(['A'])
  expect(new Set(Array.from({ length: 11 }, (_, k) => flapGlyphs('K', 'K', k / 10, 1)[0]))).toEqual(new Set(['K']))
})
