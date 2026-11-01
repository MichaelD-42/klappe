import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Browser
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const pose = (page: Page) => page.evaluate(() => getComputedStyle(document.querySelector('.k-worlds')!).transform)

async function open(query: string): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=handheld${query}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

test('handheld: the stage wanders on the wall clock with full motion, by a few px at most', async () => {
  const page = await open('&reducedmotion=0')
  const a = await pose(page)
  await page.waitForTimeout(500)
  const b = await pose(page)
  expect(a).not.toBe(b)
  // A slight scale about the centre (the transform origin) plus a few px: the matrix's shift is the centre's.
  const shift = await page.evaluate((t) => Math.hypot(new DOMMatrix(t).e, new DOMMatrix(t).f), b)
  expect(shift).toBeLessThanOrEqual(3 * Math.SQRT2)
  await page.close()
})

test('handheld holds still with reduced motion and in the walk', async () => {
  const page = await open('&reducedmotion=1')
  const a = await pose(page)
  await page.waitForTimeout(300)
  expect([a, await pose(page)]).toEqual(['none', 'none'])
  await page.close()
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=handheld`)
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems).toEqual([])
}, 120_000)
