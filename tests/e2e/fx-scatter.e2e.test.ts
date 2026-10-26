import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-scatter`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/10-scatter/scene.ts step 2: chart: period() is for a scatter or bubble chart with a period column: data/scatter.csv',
      'sections/10-a/20-bubble/scene.ts step 4: chart: no period "2030"; the periods are 2023, 2024, 2025',
    ])
  }, 120_000)

// Lower lead time is left, more deploys is up, more people is bigger; by 2025 Web has moved up and left and grown.
test('bubbles sit by their values and move to the period asked for', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-scatter#/a/bubble/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() => {
      const g = document.querySelector('[data-scene="bubble"] [data-k-chart="bubble"]')!
      const dots = [...g.querySelectorAll('circle')].map((c) => c.getBoundingClientRect()).map((b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2, d: b.width }))
      const stamp = [...g.querySelectorAll('text[data-k-text]')].find((t) => /^\d{4}$/.test(t.textContent ?? ''))?.textContent
      return { dots, stamp }
    })
  }
  const first = await at(1)
  const last = await at(3)
  expect([first.stamp, last.stamp]).toEqual(['2023', '2025'])
  const [web0, web1] = [first.dots[0], last.dots[0]]
  expect(web1.x).toBeLessThan(web0.x)
  expect(web1.y).toBeLessThan(web0.y)
  expect(web1.d).toBeGreaterThan(web0.d)
  // Area by size: 8 people against 6 is sqrt(8/6) as wide.
  expect(web1.d / web0.d).toBeCloseTo(Math.sqrt(8 / 6), 1)
  await page.close()
}, 60_000)
