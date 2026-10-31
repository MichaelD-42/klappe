import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'

let browser: Browser
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=text-steps&instant=1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  return page
}

// Which of the scene's step paragraphs show, and their font size.
const state = (page: Page, scene: string) =>
  page.evaluate((scene) =>
    [...document.querySelectorAll<HTMLElement>(`[data-scene="${scene}"] p[data-step]`)].map((p) => {
      const s = getComputedStyle(p)
      return { on: s.visibility === 'visible' && s.opacity === '1', size: parseFloat(s.fontSize) }
    }), scene)

test('a plain text step replaces the one before, set larger than body text', async () => {
  const page = await open()
  const body = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--k-size-body')))
  expect((await state(page, 'say')).map((s) => s.on)).toEqual([true, false, false])
  await page.evaluate(() => window.klappe.stepper.goto(1, 'cut'))
  expect((await state(page, 'say')).map((s) => s.on)).toEqual([false, true, false])
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForFunction(() => window.klappe.stepper.index === 2)
  const s = await state(page, 'say')
  expect(s.map((x) => x.on)).toEqual([false, false, true])
  expect(s[2].size).toBeGreaterThan(body)
  // all three sit in one place
  const tops = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('[data-scene="say"] p[data-step]')].map((p) => p.offsetTop))
  expect(new Set(tops).size).toBe(1)
  await page.close()
})

test('stack: true keeps every step on screen at body size', async () => {
  const page = await open()
  await page.evaluate(() => window.klappe.stepper.goto(4, 'cut'))
  const s = await state(page, 'stack')
  expect(s.map((x) => x.on)).toEqual([true, true])
  await page.close()
})
