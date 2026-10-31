import { expect, test } from 'vitest'
import { walkedScenes } from '../../bin/outline.mjs'

const deck = { sections: [{ id: 'a', scenes: [{ id: 'x' }, { id: 'y' }] }, { id: 'b', scenes: [{ id: 'z' }] }] }

// test --only printed one test file and three tests; it now names the scenes it walks, and the targets that match none.
test('--only targets name the scenes they walk, in deck order', () => {
  expect(walkedScenes(deck, ['b', 'a/y'])).toEqual({ scenes: ['a/y', 'b/z'], unknown: [] })
  expect(walkedScenes(deck, ['#/a', 'c', 'a/q'])).toEqual({ scenes: ['a/x', 'a/y'], unknown: ['c', 'a/q'] })
})
