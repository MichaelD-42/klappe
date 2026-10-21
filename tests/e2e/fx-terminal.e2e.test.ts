import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

const PROBLEMS = ['terminal: 30 lines do not fit; max 16']

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk passes on the terminal fixture at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-terminal`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual(PROBLEMS)
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
  })

// A deep link onto command 2 shows command 1 and its output complete, and command 2 complete.
test('a deep link onto command 2 shows both commands typed and their output', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-terminal#/a/run/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(1500)
  const r = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-scene="run"] .k-term > div')].map((e) => ({
      text: e.textContent,
      shown: e.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    })),
  )
  expect(r).toEqual([
    { text: '$ npm test', shown: true },
    { text: '3 passed', shown: true },
    { text: '$ npm run build', shown: true },
    { text: 'compiling', shown: true },
    { text: 'done', shown: true },
  ])
  await page.close()
})
