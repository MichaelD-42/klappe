import { chromium } from '@playwright/test'
import { describe, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

const AC = ['AC-1', 'AC-2', 'AC-3', 'AC-4', 'AC-5', 'AC-6', 'AC-7', 'AC-8', 'History']

// The checks name the demo deck's sections and scenes, so they only hold for klappe's own decks/demo.
describe.skipIf(!inject('IS_DEMO_DECK'))('acceptance on klappe decks/demo (skipped for any other deck)', () => {
  test('milestone 1 acceptance criteria AC-1..AC-8 and history', async () => {
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
      await speaker.getByRole('button', { name: 'Next' }).click()
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
