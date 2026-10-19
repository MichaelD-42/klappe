import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-chart#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

// The fixture's one missing dataset is its only problem; everything else must pass.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and charts are legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-chart`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['chart: DATA MISSING: data/missing.csv'])
    expect(r.steps).toBe(20)
  })

test('values count up to the data and the source is in the DOM', async () => {
  const page = await open('/a/bar/3')
  await page.waitForFunction(() => window.klappe.stepper.index === 2)
  const r = await page.evaluate(() => {
    const g = document.querySelector('[data-k-chart="bar"]')!
    return {
      src: g.getAttribute('data-k-src'),
      values: [...g.querySelectorAll('[data-k-text]')].map((e) => e.textContent),
      text: g.textContent,
    }
  })
  expect(r.src).toBe('data/quarters.csv')
  expect(r.values).toEqual(['120', '185', '−40', '240'])
  expect(r.text).toContain('Sample data')
  await page.close()
})

test('a missing dataset shows DATA MISSING with the file name', async () => {
  const page = await open('/a/missing/1')
  await page.waitForFunction(() => window.klappe.stepper.index === 15)
  const box = page.locator('div[data-k-src="data/missing.csv"]')
  expect(await box.textContent()).toBe('DATA MISSING: data/missing.csv')
  expect(await box.isVisible()).toBe(true)
  const size = await box.evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
  expect(size).toBeGreaterThanOrEqual(40)
  await page.close()
})

test('a Markdown chart link draws a bar chart in the media slot', async () => {
  const page = await open('/a/slot/2')
  await page.waitForFunction(() => window.klappe.stepper.index === 19)
  const n = await page.evaluate(
    () => document.querySelectorAll('g[data-k-media="2"] [data-k-chart="bar"] rect').length,
  )
  expect(n).toBe(4)
  await page.close()
})
