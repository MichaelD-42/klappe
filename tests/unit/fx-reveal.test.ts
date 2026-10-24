import { expect, test } from 'vitest'
import { revealUnits } from '../../src/fx/reveal'

test('by line, a string splits at its line breaks and a list gives one line each; empty lines drop', () => {
  expect(revealUnits('We ship small.\n\n  We ship often. \nWe ship together.')).toEqual(['We ship small.', 'We ship often.', 'We ship together.'])
  expect(revealUnits(['One', ' ', 'Two'])).toEqual(['One', 'Two'])
})

test('a string with no line break is one line, however long: the reveal never splits where a font wraps', () => {
  const long = 'Every change goes through review before it ships to anyone at all'
  expect(revealUnits(long)).toEqual([long])
})

test('by word, every word of every line is a unit, in order', () => {
  expect(revealUnits('Ship it\non  Friday', 'word')).toEqual(['Ship', 'it', 'on', 'Friday'])
  expect(revealUnits(['a b', 'c'], 'word')).toEqual(['a', 'b', 'c'])
})
