import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { expect, test } from 'vitest'
import { outline, stepSeconds } from '../../bin/outline.mjs'

const klappeDir = fileURLToPath(new URL('../../', import.meta.url))

function deck(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'outline-'))
  for (const [f, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true })
    writeFileSync(join(dir, f), text)
  }
  return dir
}

const sixtyFive = Array.from({ length: 65 }, () => 'word').join(' ') // 30 s at 130 words a minute

test('a step takes its note at 130 words a minute, and at least 15 s', () => {
  expect(stepSeconds('')).toBe(15)
  expect(stepSeconds(sixtyFive)).toBe(30)
})

test('the outline lists sections, scenes with deep-link ids, steps and notes', async () => {
  const dir = deck({
    'deck.md': '---\ntitle: Talk\n---\n',
    'sections/10-intro/section.md': '# Intro\n',
    'sections/10-intro/10-hello/scene.md': '## Hello\n\n> Scene note.\n\n- Welcome.\n\n> Say hi.\n\n- Agenda.\n',
    'sections/20-end/section.md': '# End\n',
    'sections/20-end/10-bye/scene.md': '## Bye\n\n### Questions?\n\nAsk now.\n',
  })
  const { text, problems } = await outline(klappeDir, dir)
  expect(problems).toEqual([])
  expect(text).toContain('# Talk (5 steps,')
  expect(text).toContain('## intro: Intro (2 steps,')
  expect(text).toContain('### intro/hello: Hello (2 steps)\n> Scene note.\n1. Welcome.\n   > Say hi.\n2. Agenda.')
  expect(text).toContain('### end/bye: Bye (3 steps)\n1. [shout-enter] Questions?\n2. [shout-fade] Questions?\n3. [shout-answer] Ask now.')
})

test('the total is measured against the duration in deck.md', async () => {
  const steps = Array.from({ length: 8 }, () => `- Step.\n\n> ${sixtyFive}\n`).join('\n') // 8 x 30 s = 4 min
  const files = { 'sections/10-a/section.md': '# A\n', 'sections/10-a/10-x/scene.md': `## X\n\n${steps}` }
  const at = async (duration: string) => (await outline(klappeDir, deck({ ...files, 'deck.md': `---\ntitle: T\nduration: ${duration}\n---\n` }))).text.split('\n')[0]
  expect(await at('3')).toBe('# T (8 steps, about 4 min; target 3 min, 1 min over)')
  expect(await at('6')).toBe('# T (8 steps, about 4 min; target 6 min, 2 min under)')
  expect(await at('4')).toBe('# T (8 steps, about 4 min; target 4 min, on target)')
  const bad = await outline(klappeDir, deck({ ...files, 'deck.md': '---\ntitle: T\nduration: soon\n---\n' }))
  expect(bad.problems).toContain('deck.md: duration needs a number of minutes, for example 45')
})
