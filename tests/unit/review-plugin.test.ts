import { expect, test } from 'vitest'
import { readEdit } from '../../bin/review-plugin.mjs'

const edit = (hash: string, order: string[]) => ({ hash, quote: 'Q', set: { content: 'C' }, order })

test('a deck whose ids have non-ASCII, dots or & can save', () => {
  expect(readEdit(edit('#/einführung/v1.2/3', ['#/einführung/v1.2/3', '#/q&a/x/1']))).not.toBeNull()
})

test('a hash that could leave its shape is refused', () => {
  for (const hash of ['../../etc', '#/a/b', '#/a/b/c', '#/a b/c/1', '#/a/b/1\n## #/x/y/2', '#//b/1'])
    expect(readEdit(edit(hash, [])), hash).toBeNull()
})
