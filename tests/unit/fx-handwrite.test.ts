import { expect, test } from 'vitest'
import { handwriteGlyphs } from '../../src/fx/handwrite'

const TEXT = 'Ship it on Friday'

test('at the start nothing is written, at the end every glyph is whole', () => {
  expect(handwriteGlyphs(TEXT, 0, 1).every((f) => f === 0)).toBe(true)
  expect(handwriteGlyphs(TEXT, 1, 1).every((f) => f === 1)).toBe(true)
  // This one's running sum rounds just below the total: the last glyph must still end whole.
  expect(handwriteGlyphs('Thanks for listening!', 1, 1).every((f) => f === 1)).toBe(true)
})

test('a glyph never unwrites, and glyphs write strictly left to right', () => {
  let prev = handwriteGlyphs(TEXT, 0, 1)
  for (let k = 1; k <= 200; k++) {
    const now = handwriteGlyphs(TEXT, k / 200, 1)
    now.forEach((f, i) => expect(f).toBeGreaterThanOrEqual(prev[i]))
    // A glyph starts only once the one before it is whole.
    now.forEach((f, i) => i > 0 && f > 0 && expect(now[i - 1]).toBe(1))
    prev = now
  }
})

test('it is a pure function of progress and seed; the seed varies the timing', () => {
  expect(handwriteGlyphs(TEXT, 0.4, 2)).toEqual(handwriteGlyphs(TEXT, 0.4, 2))
  expect(handwriteGlyphs(TEXT, 0.4, 2)).not.toEqual(handwriteGlyphs(TEXT, 0.4, 3))
})

test('an empty text gives no glyphs', () => {
  expect(handwriteGlyphs('', 0.5, 1)).toEqual([])
})
