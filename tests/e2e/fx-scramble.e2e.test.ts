import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-scramble`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

const read = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-k-scramble]')!
    const r = root.getBoundingClientRect()
    return { scrambled: root.querySelectorAll('[data-g]').length, w: r.width, h: r.height, text: root.textContent }
  })

test('mid-decode some letters are glyphs; the line keeps its size; it ends on the real text', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-scramble#/a/before/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  await page.evaluate(() => void window.klappe.stepper.next())
  // The camera flies to the scene (1.6 s), then the line fades in and decodes over 1.5 s.
  await page.clock.runFor(1600 + 700)
  const mid = await read(page)
  await page.clock.runFor(2000)
  const end = await read(page)
  expect(mid.scrambled).toBeGreaterThan(0)
  expect(end).toEqual({ scrambled: 0, w: mid.w, h: mid.h, text: 'Ship it on Friday' })
  await page.close()
}, 60_000)

test('with reduced motion the text fades in already settled', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-scramble&reducedmotion=1#/a/lines/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  expect((await read(page)).scrambled).toBe(0)
  await page.close()
})
