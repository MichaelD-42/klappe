import { expect, test } from 'vitest'
import { scrambleGlyphs } from '../../src/fx/scramble'

const TEXT = 'Ship it on Friday'

test('at the start every letter is scrambled, at the end every one has settled; spaces never scramble', () => {
  const start = scrambleGlyphs(TEXT, 0, 1)
  const end = scrambleGlyphs(TEXT, 1, 1)
  ;[...TEXT].forEach((c, i) => {
    if (c === ' ') expect(start[i]).toBeNull()
    else expect(start[i]).toMatch(/^\S$/)
  })
  expect(end.every((g) => g === null)).toBe(true)
})

test('a letter that has settled stays settled, and letters settle roughly from left to right', () => {
  let settled = new Set<number>()
  const order: number[] = []
  for (let k = 0; k <= 100; k++) {
    const now = new Set(scrambleGlyphs(TEXT, k / 100, 1).flatMap((g, i) => (g === null && TEXT[i] !== ' ' ? [i] : [])))
    for (const i of settled) expect(now.has(i)).toBe(true)
    for (const i of now) if (!settled.has(i)) order.push(i)
    settled = now
  }
  // The first half of the letters settles, on average, before the second half.
  const half = order.length / 2
  const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
  expect(mean(order.slice(0, half))).toBeLessThan(mean(order.slice(half)))
})

test('it is a pure function of progress: same input, same glyphs; the glyphs change as progress moves', () => {
  expect(scrambleGlyphs(TEXT, 0.3, 2)).toEqual(scrambleGlyphs(TEXT, 0.3, 2))
  expect(scrambleGlyphs(TEXT, 0.1, 2)).not.toEqual(scrambleGlyphs(TEXT, 0.15, 2))
})

// A glyph matches its letter's kind, so it takes about the same width: lowercase, capitals, digits.
test('a lowercase letter scrambles to lowercase, a capital to a capital, a digit to a digit', () => {
  const text = 'aB3'
  for (let k = 0; k < 10; k++) {
    const [a, b, c] = scrambleGlyphs(text, 0, k)
    expect(a).toMatch(/^[a-z]$/)
    expect(b).toMatch(/^[A-Z]$/)
    expect(c).toMatch(/^[0-9]$/)
  }
})
