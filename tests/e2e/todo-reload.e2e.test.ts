import { chromium } from '@playwright/test'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, inject, test } from 'vitest'

// klappe test writes data/TODO.md and media/TODO.md; they are no part of the deck and must not reload an open one.
test('the TODO.md files klappe test writes do not reload the deck', async () => {
  if (!inject('IS_DEMO_DECK')) return
  const files = ['data', 'media'].map((d) => fileURLToPath(new URL(`../../decks/demo/${d}/TODO.md`, import.meta.url)))
  const kept = files.map((f) => (existsSync(f) ? readFileSync(f, 'utf8') : null))
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${inject('BASE_URL')}/`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await page.evaluate(() => ((window as any).marker = 1))
    for (const f of files) writeFileSync(f, '- [ ] a line klappe test wrote\n')
    await page.waitForTimeout(1500) // a reload would come within this
    expect(await page.evaluate(() => (window as any).marker)).toBe(1)
  } finally {
    files.forEach((f, i) => (kept[i] === null ? rmSync(f, { force: true }) : writeFileSync(f, kept[i]!)))
    await browser.close()
  }
}, 60_000)
