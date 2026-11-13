import { mkdtempSync, renameSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import { waitForReady } from '../../bin/review-wait.mjs'
import { readyFindings } from '../../src/review/file'

const draft = '# Review\n\n## #/a/s/1\n\n> One.\n\n### Content\n\nToo long.\n'
const sent = `${draft}\n#### Sent\n`
const later = (ms: number) => new Promise((r) => setTimeout(r, ms))
const pending = Symbol('pending')
const settled = (p: Promise<unknown>, ms = 300) => Promise.race([p, later(ms).then(() => pending)])

test('returns at once when a finding is already ready', async () => {
  const file = join(mkdtempSync(join(tmpdir(), 'rw-')), 'review.md')
  writeFileSync(file, sent)
  expect(await waitForReady(file, readyFindings)).toEqual(['#/a/s/1'])
})

test('waits while there is no file or only drafts, and returns once a finding is sent', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rw-'))
  const file = join(dir, 'review.md')
  const wait = waitForReady(file, readyFindings)
  expect(await settled(wait)).toBe(pending)
  writeFileSync(file, draft)
  expect(await settled(wait)).toBe(pending)
  writeFileSync(file, sent)
  expect(await settled(wait, 5000)).toEqual(['#/a/s/1'])
})

test('sees a save that renames a new file into place', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'rw-'))
  const file = join(dir, 'review.md')
  writeFileSync(file, draft)
  const wait = waitForReady(file, readyFindings)
  expect(await settled(wait)).toBe(pending)
  writeFileSync(join(dir, 'review.md.tmp'), sent)
  renameSync(join(dir, 'review.md.tmp'), file)
  expect(await settled(wait, 5000)).toEqual(['#/a/s/1'])
})
