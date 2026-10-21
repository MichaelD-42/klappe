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
    expect(r.problems).toEqual([
      'chart: DATA MISSING: data/missing.csv',
      'chart: DATA ERROR: data/bad.csv (row 2, column units not a number)',
      'chart: DATA ERROR: data/null.json (not an array of rows)',
    ])
    expect(r.steps).toBe(26)
  })

test('the source reaches the notes: origin from the CSV, the JSON, or not stated', async () => {
  const page = await open('/a/bar/1')
  const notes = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll<SVGElement>('[data-k-chart]')].map((g) => [g.closest('[data-scene]')!.getAttribute('data-scene'), g.dataset.kNote]),
    ),
  )
  expect(notes.bar).toBe('Source: data/quarters.csv — klappe demo sample')
  expect(notes.stacked).toBe('Source: data/mix.json — klappe demo sample')
  expect(notes.line).toBe('Source: data/trend.csv — origin not stated')
  expect(notes.timeline).toBe('Source: data/plan.csv — origin not stated')
  await page.close()
})

test('a waterfall starts plain, signs its changes and closes with a total', async () => {
  const page = await open('/a/waterfall/3')
  await page.waitForFunction(() => window.klappe.stepper.index === 11)
  const values = await page.evaluate(() =>
    [...document.querySelectorAll('[data-k-chart="waterfall"] [data-k-text]')].map((e) => e.textContent),
  )
  expect(values).toEqual(['100', '−25', '+15', '−30', '+20', '80'])
  await page.close()
})

test('a bad cell shows DATA ERROR and draws nothing', async () => {
  const page = await open('/a/bad/1')
  await page.waitForFunction(() => window.klappe.stepper.index === 20)
  const box = page.locator('div[data-k-src="data/bad.csv"]')
  expect(await box.textContent()).toBe('DATA ERROR: data/bad.csv')
  expect(await box.isVisible()).toBe(true)
  expect(await page.evaluate(() => document.querySelectorAll('[data-k-src="data/bad.csv"][data-k-chart]').length)).toBe(0)
  await page.close()
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

test('the Sample data label uses --k-warn and ends inside the chart rect', async () => {
  const page = await open('/a/bar/1')
  const r = await page.evaluate(() => {
    const s = [...document.querySelectorAll<SVGTextElement>('[data-k-chart="bar"] text')].find((e) => e.textContent === 'Sample data')!
    const b = s.getBBox()
    return { fill: s.style.fill, right: b.x + b.width }
  })
  expect(r.fill).toBe('var(--k-warn)')
  expect(r.right).toBeLessThanOrEqual(160 + 1600 - 20) // the fixture rect ends at x 1760
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
  const r = await page.evaluate(() => {
    const g = document.querySelector('g[data-k-media="2"] [data-k-chart="bar"]')!
    // Rendered size: computed font size times the full screen transform (stage fit, camera, wrappers).
    const sizes = [...g.querySelectorAll('text')].map((t) => {
      const m = t.getScreenCTM()!
      return parseFloat(getComputedStyle(t).fontSize) * Math.hypot(m.a, m.b)
    })
    return { bars: g.querySelectorAll('rect').length, smallest: Math.min(...sizes) }
  })
  console.log(`slot chart: smallest text ${r.smallest.toFixed(1)} px at 1366`)
  expect(r.bars).toBe(4)
  expect(r.smallest).toBeGreaterThanOrEqual(14)
  await page.close()
})
