import { chromium } from '@playwright/test'
import { expect, inject, test } from 'vitest'

// The speaker view is built from klappe's words: it shows the deck's own, and the main window lists the bad key.
test("a deck's strings.json gives klappe's UI its words; an unknown key is a deck problem", async () => {
  const browser = await chromium.launch()
  try {
    const context = await browser.newContext()
    const main = await context.newPage()
    await main.goto(`${inject('BASE_URL')}/?fixture=own-words`)
    await main.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    expect(await main.evaluate(() => window.klappe.problems)).toEqual(["strings.json: unknown key 'nope'"])
    const speaker = await context.newPage()
    await speaker.goto(`${inject('BASE_URL')}/?fixture=own-words&speaker=1`)
    await speaker.waitForFunction(() => window.klappe?.speakerView, undefined, { timeout: 30_000 })
    const words = await speaker.evaluate(() => [...document.querySelectorAll('.k-sp-buttons button, .k-sp-label')].map((e) => e.textContent))
    expect(words).toEqual(expect.arrayContaining(['Suivant', 'Précédent', 'Ensuite', 'Timer']))
  } finally {
    await browser.close()
  }
}, 60_000)
