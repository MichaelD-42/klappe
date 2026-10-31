import { expect, test } from 'vitest'
import { outline, walkedScenes } from '../../bin/outline.mjs'

const deck = { sections: [{ id: 'a', scenes: [{ id: 'x' }, { id: 'y' }] }, { id: 'b', scenes: [{ id: 'z' }] }] }

// test --only printed one test file and three tests; it now names the scenes it walks, and the targets that match none.
test('--only targets name the scenes they walk, in deck order', () => {
  expect(walkedScenes(deck, ['b', 'a/y'])).toEqual({ scenes: ['a/y', 'b/z'], unknown: [] })
  expect(walkedScenes(deck, ['#/a', 'c', 'a/q'])).toEqual({ scenes: ['a/x', 'a/y'], unknown: ['c', 'a/q'] })
})

// The demo's first scene carries a story point: plain outline shows it under the title, --story prints only the story lines.
test('--story prints one deep link and story point per scene; outline shows the point under the title', async () => {
  const { text: story } = await outline('.', 'decks/demo', { story: true })
  const lines = story.trimEnd().split('\n')
  expect(lines.every((l) => /^#\/[\w-]+\/[\w-]+: \S/.test(l))).toBe(true)
  expect(lines[0]).toMatch(/^#\/opening\/old-way: \S/)
  expect(lines.some((l) => l.endsWith('(no story point)'))).toBe(true)
  const { text } = await outline('.', 'decks/demo')
  expect(text).toMatch(/### opening\/old-way: .*\nStory: \S/)
})
