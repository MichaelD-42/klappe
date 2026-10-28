import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { overWords } from '../../bin/outline.mjs'

const klappeDir = fileURLToPath(new URL('../../', import.meta.url))

function deck(maxWords: string | undefined) {
  const dir = mkdtempSync(join(tmpdir(), 'max-words-'))
  const files = {
    'deck.md': `---\ntitle: T\n${maxWords === undefined ? '' : `max-words: ${maxWords}\n`}---\n`,
    'sections/10-a/section.md': '# A\n',
    // Notes do not count, only the list item.
    'sections/10-a/10-b/scene.md': '## B\n\n- Three words here.\n\n> A long note that has many more words than the limit allows.\n\n- Four words are here.\n- Five words are right here.\n',
  }
  for (const [f, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true })
    writeFileSync(join(dir, f), text)
  }
  return dir
}

test('max-words names each step whose list item has more words', async () => {
  expect(await overWords(klappeDir, deck('3'))).toEqual(['#/a/b/2: 4 words > 3', '#/a/b/3: 5 words > 3'])
  expect(await overWords(klappeDir, deck('5'))).toEqual([])
})

test('no max-words, no check; a bad value is a problem', async () => {
  expect(await overWords(klappeDir, deck(undefined))).toEqual([])
  expect(await overWords(klappeDir, deck('lots'))).toEqual(['deck.md: max-words needs a whole number of words, for example 12'])
})
