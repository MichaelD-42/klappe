import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const BAD = 'sections/10-a/20-bad/scene.ts step 2: barRace: no period "2030"; the periods are 2021, 2022, 2023, 2024'

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-race`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([BAD])
  }, 120_000)

// The contenders on screen, top to bottom, with their values, and the period shown.
const board = (page: Page) =>
  page.evaluate(() => {
    const g = document.querySelector('[data-scene="race"] [data-k-chart="race"]')!
    const shown = [...g.querySelectorAll<SVGGElement>('[data-k-contender]')]
      .filter((c) => getComputedStyle(c).visibility === 'visible' && +getComputedStyle(c).opacity > 0.5)
      .map((c) => ({ name: c.dataset.kContender!, y: c.getBoundingClientRect().y, value: c.querySelector('[data-k-text]')!.textContent }))
      .sort((a, b) => a.y - b.y)
      .map(({ name, value }) => `${name} ${value}`)
    const period = [...g.querySelectorAll('text[data-k-text]')].find((t) => !t.closest('[data-k-contender]'))!.textContent
    return { shown, period }
  })

test('each year the top three stand in order, by play and by deep link', async () => {
  const want = [
    { shown: ['Alpha 50', 'Bravo 40', 'Charlie 30'], period: '2021' },
    { shown: ['Bravo 60', 'Alpha 55', 'Charlie 35'], period: '2022' },
    { shown: ['Charlie 70', 'Echo 65', 'Bravo 62'], period: '2023' },
    { shown: ['Echo 90', 'Charlie 72', 'Bravo 64'], period: '2024' },
  ]
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-race#/a/race/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  expect(await board(page)).toEqual(want[0])
  for (let k = 1; k < 4; k++) {
    await page.evaluate(() => window.klappe.stepper.next())
    expect(await board(page)).toEqual(want[k])
  }
  await page.close()
  const deep = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await deep.goto(`${inject('BASE_URL')}/?fixture=fx-race#/a/race/3`)
  await deep.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(deep)
  expect(await board(deep)).toEqual(want[2])
  await deep.close()
}, 60_000)
