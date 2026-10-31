import { expect, test } from 'vitest'
import { fresh, readEdit, readText, replaceText } from '../../bin/review-plugin.mjs'

const edit = (hash: string, order: string[]) => ({ hash, quote: 'Q', set: { content: 'C' }, order })

test('a deck whose ids have non-ASCII, dots or & can save', () => {
  expect(readEdit(edit('#/einführung/v1.2/3', ['#/einführung/v1.2/3', '#/q&a/x/1']))).not.toBeNull()
})

test('a hash that could leave its shape is refused', () => {
  for (const hash of ['../../etc', '#/a/b', '#/a/b/c', '#/a b/c/1', '#/a/b/1\n## #/x/y/2', '#//b/1'])
    expect(readEdit(edit(hash, [])), hash).toBeNull()
})

// A window that closes sends its last saves at once, beside one still in flight: they can land in any order.
test('a category already saved by a newer save from the same window is not set back', () => {
  const seen = new Map<string, number>()
  const e = (set: Record<string, string>) => ({ hash: '#/a/s/1', quote: 'Q', set })
  expect(fresh(seen, 'w1', 2, e({ content: 'AB' })).set).toEqual({ content: 'AB' })
  expect(fresh(seen, 'w1', 1, e({ content: 'A', visuals: 'V' })).set).toEqual({ visuals: 'V' })
  expect(fresh(seen, 'w2', 1, e({ content: 'other window' })).set).toEqual({ content: 'other window' })
  expect(fresh(seen, 'w1', 1, { hash: '#/a/s/2', quote: 'Q', set: { content: 'other step' } }).set).toEqual({ content: 'other step' })
})

test('a save without a window and number is applied as sent', () => {
  expect(fresh(new Map(), undefined, undefined, { hash: '#/a/s/1', quote: 'Q', set: { content: 'C' } }).set).toEqual({ content: 'C' })
  expect(readEdit({ hash: '#/a/s/1', quote: 'Q', set: {}, order: [], from: 'w1', seq: 3 })).toMatchObject({ from: 'w1', seq: 3 })
  expect(readEdit({ hash: '#/a/s/1', quote: 'Q', set: {}, order: [], from: 'w1', seq: -1 })).toBeNull()
})

test('approve and reopen pass with categories; anything else in them is refused', () => {
  const base = { hash: '#/a/s/1', quote: 'Q', set: {}, order: [] }
  expect(readEdit({ ...base, approve: ['content'], reopen: { visuals: 'Still dark.' } })?.edit).toEqual({ ...base, order: undefined, approve: ['content'], reopen: { visuals: 'Still dark.' } })
  for (const bad of [{ approve: 'content' }, { approve: ['nope'] }, { reopen: { content: 7 } }, { reopen: { nope: 'x' } }, { reopen: ['content'] }])
    expect(readEdit({ ...base, ...bad }), JSON.stringify(bad)).toBeNull()
})

test('replaceText changes the one scene.md line that holds the text: a list item, a task, the title or a question', () => {
  const md = '## Old title\n\n- First step.\n- [x] Done thing\n\n### Why?\n\nBecause.\n'
  expect(replaceText(md, 'First step.', 'First, a step.')).toBe(md.replace('- First step.', '- First, a step.'))
  expect(replaceText(md, 'Done thing', 'All done')).toBe(md.replace('- [x] Done thing', '- [x] All done'))
  expect(replaceText(md, 'Old title', 'New title')).toBe(md.replace('## Old title', '## New title'))
  expect(replaceText(md, 'Why?', 'Why not?')).toBe(md.replace('### Why?', '### Why not?'))
})

test('replaceText refuses text that is not on exactly one line, and a replacement that is not one line', () => {
  expect(replaceText('- Same.\n- Same.\n', 'Same.', 'Other.')).toBeNull()
  expect(replaceText('- A [link](media/x.png).\n', 'A link.', 'B.')).toBeNull()
  expect(replaceText('- A.\n', 'A.', 'B.\n- injected')).toBeNull()
  expect(replaceText('- A.\n', 'A.', '  ')).toBeNull()
})

test('readText takes a scene.md path inside sections/ only', () => {
  const ok = { source: 'sections/10-a/20-b/scene.md', from: 'x', to: 'y' }
  expect(readText(ok)).toEqual(ok)
  for (const source of ['../deck.md', 'sections/10-a/../../x/scene.md', 'sections/a/scene.md', '/etc/scene.md', 'sections/a/b/scene.ts'])
    expect(readText({ ...ok, source }), source).toBeNull()
})
