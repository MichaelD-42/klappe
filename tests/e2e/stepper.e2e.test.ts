import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'

// Review focus 2: keys pressed while a step plays.
let browser: Browser
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(inject('BASE_URL'))
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  return page
}

const shown = (page: Page, n: number) =>
  page.evaluate((n) => {
    const s = getComputedStyle(document.querySelector(`[data-scene="old-way"] [data-step="${n}"]`)!)
    return s.visibility === 'visible' && s.opacity === '1'
  }, n)

test('a key during a play finishes it, then advances once', async () => {
  const page = await open()
  const ms = await page.evaluate(async () => {
    const s = window.klappe.stepper
    s.next()
    await new Promise((r) => setTimeout(r, 150)) // mid-play
    const t0 = performance.now()
    await s.next()
    return performance.now() - t0
  })
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(2)
  expect(await shown(page, 3)).toBe(true)
  expect(await shown(page, 4)).toBe(false)
  expect(ms).toBeLessThan(1000) // one step (0.6 s), not the rest of the first plus a second
  await page.close()
})

test('a same-tick burst of 3 presses lands exactly 3 steps on', async () => {
  const page = await open()
  const ms = await page.evaluate(async () => {
    const s = window.klappe.stepper
    const t0 = performance.now()
    await Promise.all([s.next(), s.next(), s.next()])
    return performance.now() - t0
  })
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(3)
  expect(await shown(page, 4)).toBe(true)
  expect(ms).toBeLessThan(1200) // queued moves are fast-forwarded; only the last one plays
  await page.close()
})
