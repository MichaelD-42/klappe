import { chromium } from '@playwright/test'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, inject, test } from 'vitest'
// @ts-expect-error plain .mjs, no types
import { writeTodos } from '../../bin/todo.mjs'
import { files } from '../../src/deck/fixtures/acceptance-todo'
import { runSelftest } from './driver'

const AC = ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-5', 'AC-6', 'AC-7', 'AC-8', 'AC-9', 'AC-12', 'AC-13', 'History']

// AC-10 and AC-11 run on the fixture deck acceptance-todo (ruling R16: the demo deck walks clean),
// so they hold in any deck repo. On screen: the placeholders. On disk: the TODO lines klappe test writes.
describe('acceptance on missing files (fixture acceptance-todo)', () => {
  const shows = async (step: number) => {
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
      await page.goto(`${inject('BASE_URL')}/?fixture=acceptance-todo#/a/missing/${step}`)
      await page.waitForFunction((n) => window.klappe?.stepper?.index === n - 1, step, { timeout: 30_000 })
      return await page.evaluate((n) => {
        const shown = [...document.querySelectorAll<HTMLElement>(`[data-k-media="${n}"]`)].filter((e) =>
          e.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        )
        return { text: shown.map((e) => e.textContent).join(' '), problems: window.klappe.problems as string[] }
      }, step)
    } finally {
      await browser.close()
    }
  }
  const todos = () => {
    const d = mkdtempSync(join(tmpdir(), 'klappe-ac-'))
    for (const [f, text] of Object.entries(files)) {
      mkdirSync(dirname(join(d, f)), { recursive: true })
      writeFileSync(join(d, f), text)
    }
    writeTodos(d)
    return (kind: string) => readFileSync(join(d, kind, 'TODO.md'), 'utf8')
  }

  test('AC-10: a missing CSV shows DATA MISSING and data/TODO.md lists the file', async () => {
    const r = await shows(2)
    expect(r.text).toContain('DATA MISSING')
    expect(r.problems.some((p) => p.includes('DATA MISSING'))).toBe(true)
    expect(todos()('data')).toBe('- [ ] data/missing.csv — needed by sections/10-a/10-missing/scene.md\n')
  })

  test('AC-11: a missing image shows IMAGE MISSING and media/TODO.md holds its prompt line', async () => {
    const r = await shows(3)
    expect(r.text).toContain('IMAGE MISSING')
    expect(r.text).toContain('An engine')
    expect(r.problems.some((p) => p.includes('IMAGE MISSING'))).toBe(true)
    expect(todos()('media')).toBe(
      '- [ ] media/missing.png — prompt: A cutaway drawing of an engine for a presentation scene about Missing files\n',
    )
  })
})

// The checks name the demo deck's sections and scenes, so they only hold for klappe's own decks/demo.
describe.skipIf(!inject('IS_DEMO_DECK'))('acceptance on klappe decks/demo (skipped for any other deck)', () => {
  test('acceptance criteria AC-1..AC-9, AC-12, AC-13 and history on the demo deck', async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=ac`)
    expect(r.mode).toBe('ac')
    expect(r.checks.map((c) => c.name)).toEqual(AC)
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.errors).toEqual([])
    expect(r.ok).toBe(true)
  })

  // AC-3 with real input: main window and speaker view as two pages, stepping in each one.
  test('speaker view stays in sync with real keyboard and click input', async () => {
    const browser = await chromium.launch()
    try {
      const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
      const main = await context.newPage()
      await main.goto(`${inject('BASE_URL')}/?instant=1`)
      await main.waitForFunction(() => window.klappe?.stepper?.index === 0)
      const textAt = (i: number) =>
        main.evaluate((i) => {
          const { deck, steps } = window.klappe
          const a = steps[i]
          const sc = deck.sections.find((s: any) => s.id === a.section).scenes.find((s: any) => s.id === a.scene)
          return sc.steps[a.step - 1].text as string
        }, i)
      const mainIndex = () => main.evaluate(() => window.klappe.stepper.index as number)

      const speaker = await context.newPage()
      await speaker.goto(`${inject('BASE_URL')}/?speaker=1`)
      const text = speaker.locator('.k-sp-text')
      await expect.poll(() => text.textContent()).toBe(await textAt(0))

      // Main to speaker: a real key press in the main window.
      await main.bringToFront()
      await main.keyboard.press('ArrowRight')
      await expect.poll(mainIndex).toBe(1)
      await expect.poll(() => text.textContent()).toBe(await textAt(1))

      // Speaker to main: a click on Next, then a key press in the speaker window.
      await speaker.bringToFront()
      await speaker.getByRole('button', { name: 'Next', exact: true }).click()
      await expect.poll(mainIndex).toBe(2)
      await expect.poll(() => text.textContent()).toBe(await textAt(2))
      await speaker.keyboard.press('ArrowLeft')
      await expect.poll(mainIndex).toBe(1)
      await expect.poll(() => text.textContent()).toBe(await textAt(1))
    } finally {
      await browser.close()
    }
  })
})
