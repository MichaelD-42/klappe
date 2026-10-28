import { expect, test } from 'vitest'
import { applyEdit, parseReview, stepsWithFindings, waitingForApproval } from '../../src/review/file'

const T = (n: number) => `#/a/s/${n}`
const order = [T(1), T(2), T(3)]

test('the first finding creates the file with its step, quote and category', () => {
  expect(applyEdit('', { hash: T(2), quote: 'Two.', set: { visuals: 'Too dark.' } }, order)).toBe(
    '# Review\n\n## #/a/s/2\n\n> Two.\n\n### Visuals\n\nToo dark.\n',
  )
})

test('entries stay in deck order; a step not in the deck goes last', () => {
  let t = applyEdit('', { hash: '#/gone/x/1', quote: 'Old.', set: { content: 'A' } }, order)
  t = applyEdit(t, { hash: T(3), quote: 'Three.', set: { content: 'C' } }, order)
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { content: 'B' } }, order)
  expect(parseReview(t).map((e) => e.hash)).toEqual([T(1), T(3), '#/gone/x/1'])
})

test('a save sets only the categories it names', () => {
  let t = applyEdit('', { hash: T(1), quote: 'One.', set: { content: 'C', visuals: 'V' } }, order)
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { content: 'C2' } }, order)
  expect(parseReview(t)[0].findings).toEqual({ content: 'C2', visuals: 'V' })
})

test('categories come out Content, Storytelling, Visuals whatever the save order', () => {
  let t = applyEdit('', { hash: T(1), quote: 'One.', set: { visuals: 'V' } }, order)
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { content: 'C' } }, order)
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { storytelling: 'S' } }, order)
  expect(t.match(/^### .*$/gm)).toEqual(['### Content', '### Storytelling', '### Visuals'])
})

test('a whitespace-only field removes its category; an empty step loses its entry; no entries leaves "# Review\\n"', () => {
  let t = applyEdit('', { hash: T(1), quote: 'One.', set: { content: 'C', visuals: 'V' } }, order)
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { visuals: '  \n ' } }, order)
  expect(parseReview(t)[0].findings).toEqual({ content: 'C' })
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { content: '' } }, order)
  expect(parseReview(t)).toEqual([])
  expect(t).toBe('# Review\n')
})

test('a finding with lines that start with # round-trips and does not split the entry', () => {
  const text = '## #/a/s/2 is wrong\n### Visuals\n# heading\n\\ a backslash'
  const t = applyEdit('', { hash: T(1), quote: 'One.', set: { storytelling: text } }, order)
  expect(parseReview(t)).toEqual([{ hash: T(1), quote: 'One.', findings: { storytelling: text } }])
})

test('multi-line findings, quotes, pipes and non-ASCII round-trip', () => {
  const text = 'Zeile 1\n\n„Zitat“ | 3 > 2\n- a list item'
  const t = applyEdit('', { hash: T(2), quote: 'Zwei „Schritte“.', set: { content: text } }, order)
  expect(parseReview(t)).toEqual([{ hash: T(2), quote: 'Zwei „Schritte“.', findings: { content: text } }])
})

test('a hand edit survives a save: CRLF, text before the first entry, an unknown ### heading', () => {
  const hand = '# Review\r\n\r\nNotes for Friday.\r\n\r\n## #/a/s/1\r\n\r\n> One.\r\n\r\n### Note\r\n\r\nKeep me.\r\n'
  const t = applyEdit(hand, { hash: T(2), quote: 'Two.', set: { content: 'X' } }, order)
  expect(t).toContain('Notes for Friday.')
  expect(t).toContain('### Note\n\nKeep me.')
  expect(t).not.toContain('\r')
  expect(parseReview(t).map((e) => e.hash)).toEqual([T(1), T(2)])
})

test('an unknown ### heading keeps its entry when its last category goes, and comes after the known ones', () => {
  const hand = '# Review\n\n## #/a/s/1\n\n> One.\n\n### Note\n\nKeep me.\n'
  let t = applyEdit(hand, { hash: T(1), quote: 'One.', set: { visuals: 'V' } }, order)
  expect(t.match(/^### .*$/gm)).toEqual(['### Visuals', '### Note'])
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { visuals: '' } }, order)
  expect(t).toContain('### Note\n\nKeep me.')
})

test('a ## heading that is not a deep link stays as text', () => {
  const hand = '# Review\n\n## Later\n\nIdeas.\n'
  const t = applyEdit(hand, { hash: T(1), quote: 'One.', set: { content: 'C' } }, order)
  expect(t).toContain('## Later\n\nIdeas.')
  expect(parseReview(t).map((e) => e.hash)).toEqual([T(1)])
})

test('the quote is updated to the step text the save sends', () => {
  let t = applyEdit('', { hash: T(1), quote: 'Old text.', set: { content: 'C' } }, order)
  t = applyEdit(t, { hash: T(1), quote: 'New text.', set: { visuals: 'V' } }, order)
  expect(parseReview(t)[0].quote).toBe('New text.')
})

test('stepsWithFindings counts entries with at least one category', () => {
  let t = applyEdit('# Review\n\n## #/a/s/3\n\n> Three.\n\n### Note\n\nOnly a note.\n', { hash: T(1), quote: 'One.', set: { content: 'C' } }, order)
  t = applyEdit(t, { hash: T(2), quote: 'Two.', set: { visuals: 'V', storytelling: 'S' } }, order)
  expect(stepsWithFindings(t)).toBe(2)
  expect(stepsWithFindings('')).toBe(0)
})

test('text written by hand under a step heading, before its categories, survives a save', () => {
  const hand = '# Review\n\n## #/a/s/1\n\n> One.\n\nSee also step 3.\n\n### Content\n\nC\n'
  const t = applyEdit(hand, { hash: T(1), quote: 'One.', set: { visuals: 'V' } }, order)
  expect(t).toContain('See also step 3.')
  expect(parseReview(t)[0]).toEqual({ hash: T(1), quote: 'One.', findings: { content: 'C', visuals: 'V' } })
})

// Folder ids are free text after the number prefix: "10-einführung", "20-v1.2", "30-q&a".
test('a deep link with non-ASCII, dots or & in its ids is a step entry', () => {
  const hash = '#/einführung/v1.2/3'
  const t = applyEdit('', { hash, quote: 'Drei.', set: { content: 'C' } }, [hash, '#/q&a/x/1'])
  expect(parseReview(t)).toEqual([{ hash, quote: 'Drei.', findings: { content: 'C' } }])
})

test('a BOM or blank lines before "# Review" do not duplicate the title', () => {
  const t = applyEdit('﻿\n\n# Review\n', { hash: T(1), quote: 'One.', set: { content: 'C' } }, order)
  expect(t.match(/^# Review$/gm)).toHaveLength(1)
  expect(t.startsWith('# Review\n')).toBe(true)
})

test('a category heading with nothing under it is no finding', () => {
  const hand = '# Review\n\n## #/a/s/1\n\n> One.\n\n### Content\n\n### Visuals\n\nV\n\n## #/a/s/2\n\n> Two.\n\n### Content\n'
  expect(parseReview(hand).map((e) => e.findings)).toEqual([{ visuals: 'V' }, {}])
  expect(stepsWithFindings(hand)).toBe(1)
  const t = applyEdit(hand, { hash: T(3), quote: 'Three.', set: { content: 'C' } }, order)
  expect(parseReview(t).map((e) => e.hash)).toEqual([T(1), T(3)])
})

test('a hand-written "## " line inside a finding stays in it, and a hand-written leading backslash stays', () => {
  const hand = '# Review\n\n## #/a/s/1\n\n> One.\n\n### Content\n\nFirst line\n## not a step\n\\n is a newline\n\n## #/a/s/2\n\n> Two.\n\n### Visuals\n\nV\n'
  expect(parseReview(hand)[0].findings.content).toBe('First line\n## not a step\n\\n is a newline')
  const t = applyEdit(hand, { hash: T(2), quote: 'Two.', set: { visuals: 'V2' } }, order)
  expect(parseReview(t)[0].findings.content).toBe('First line\n## not a step\n\\n is a newline')
  expect(parseReview(t).map((e) => e.hash)).toEqual([T(1), T(2)])
})

test('a finding keeps the indentation of its first line', () => {
  const text = '    const x = 1;\n    return x;'
  const t = applyEdit('', { hash: T(1), quote: 'One.', set: { content: `\n${text}\n\n` } }, order)
  expect(parseReview(t)[0].findings.content).toBe(text)
})

// Claude marks a finding fixed instead of deleting it; the owner approves it (gone) or reopens it with a note.
const fixedFile = '# Review\n\n## #/a/s/1\n\n> One.\n\n### Content\n\nToo long.\n\n#### Fixed\n\nCut to four words (a1b2c3d).\n'

test('a finding with a Fixed section reads as fixed, with its note, and survives an edit elsewhere', () => {
  expect(parseReview(fixedFile)[0]).toEqual({ hash: T(1), quote: 'One.', findings: { content: 'Too long.' }, fixed: { content: 'Cut to four words (a1b2c3d).' } })
  const t = applyEdit(fixedFile, { hash: T(2), quote: 'Two.', set: { visuals: 'V' } }, order)
  expect(t.startsWith(fixedFile)).toBe(true)
})

test('approving a fixed finding removes it; approving an open one does nothing', () => {
  expect(applyEdit(fixedFile, { hash: T(1), quote: 'One.', set: {}, approve: ['content'] }, order)).toBe('# Review\n')
  const open = applyEdit('', { hash: T(1), quote: 'One.', set: { content: 'C' } }, order)
  expect(applyEdit(open, { hash: T(1), quote: 'One.', set: {}, approve: ['content'] }, order)).toBe(open)
})

test('reopening adds the note under Reopened; the finding is open again, and a second fix makes it fixed', () => {
  const t = applyEdit(fixedFile, { hash: T(1), quote: 'One.', set: {}, reopen: { content: 'Still wraps on a phone.' } }, order)
  expect(t).toBe(`${fixedFile}\n#### Reopened\n\nStill wraps on a phone.\n`)
  expect(parseReview(t)[0]).toEqual({ hash: T(1), quote: 'One.', findings: { content: 'Too long.' } })
  expect(parseReview(`${t}\n#### Fixed\n\nThree words.\n`)[0].fixed).toEqual({ content: 'Three words.' })
  // Reopening an open finding adds nothing.
  expect(applyEdit(t, { hash: T(1), quote: 'One.', set: {}, reopen: { content: 'Again.' } }, order)).toBe(t)
})

test('editing a reopened finding keeps its history; clearing it removes the history too', () => {
  let t = applyEdit(fixedFile, { hash: T(1), quote: 'One.', set: {}, reopen: { content: 'No.' } }, order)
  t = applyEdit(t, { hash: T(1), quote: 'One.', set: { content: 'Far too long.' } }, order)
  expect(t).toContain('### Content\n\nFar too long.\n\n#### Fixed\n\nCut to four words (a1b2c3d).\n\n#### Reopened\n\nNo.\n')
  expect(applyEdit(t, { hash: T(1), quote: 'One.', set: { content: '' } }, order)).toBe('# Review\n')
})

test('a Fixed heading typed into a finding stays text', () => {
  const t = applyEdit('', { hash: T(1), quote: 'One.', set: { content: 'A\n#### Fixed\nB' } }, order)
  expect(parseReview(t)[0]).toEqual({ hash: T(1), quote: 'One.', findings: { content: 'A\n#### Fixed\nB' } })
})

test('steps with findings count open ones only; fixed ones wait for approval', () => {
  const t = applyEdit(fixedFile, { hash: T(2), quote: 'Two.', set: { visuals: 'V' } }, order)
  expect(stepsWithFindings(t)).toBe(1)
  expect(waitingForApproval(t)).toBe(1)
  expect(waitingForApproval('')).toBe(0)
})
