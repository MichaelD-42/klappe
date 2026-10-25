import { expect, test } from 'vitest'
import { keyParts, revealUnits } from '../../src/fx/reveal'

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

test('by word, a **marked** phrase splits into marked words; by line, the markers stay in the line', () => {
  expect(revealUnits('We ship **small and often**, **together**.', 'word')).toEqual(['We', 'ship', '**small**', '**and**', '**often**,', '**together**.'])
  expect(revealUnits('We ship **small**.')).toEqual(['We ship **small**.'])
})

test('keyParts gives the marked parts as key, punctuation outside the markers as plain', () => {
  expect(keyParts('**often**,')).toEqual([{ text: 'often', key: true }, { text: ',', key: false }])
  expect(keyParts('We ship **small** and **often**.')).toEqual([
    { text: 'We ship ', key: false }, { text: 'small', key: true }, { text: ' and ', key: false }, { text: 'often', key: true }, { text: '.', key: false },
  ])
  expect(keyParts('plain')).toEqual([{ text: 'plain', key: false }])
})
