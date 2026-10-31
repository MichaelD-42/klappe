import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string, reduced = false): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-titling${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-titling`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

test('the end roll lists each recorded source once, in deck order, and leaves out the placeholder', async () => {
  const page = await open('#/a/roll/1')
  const rows = await page.evaluate(() => [...document.querySelectorAll('div[data-scene="roll"] [data-k-source]')].map((e) => e.textContent))
  expect(rows).toEqual(['Statistik A', 'Statistik B', 'Survey C'])
  await page.close()
})

test('the lower third sits in the safe area, slides in on show and out on hide', async () => {
  const page = await open('#/a/name/1')
  const box = () => page.evaluate(() => {
    const r = document.querySelector('div[data-scene="name"] [data-k-lowerthird]')!.getBoundingClientRect()
    return { l: r.left, b: r.bottom, a: +getComputedStyle(document.querySelector('div[data-scene="name"] [data-k-lowerthird]')!).opacity }
  })
  const shown = await box()
  expect(shown.a).toBe(1)
  expect(shown.l).toBeGreaterThanOrEqual(63)
  expect(shown.b).toBeLessThanOrEqual(1080 - 47)
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.stepper.index + 1, 'cut'))
  await settle(page)
  expect((await box()).l).toBeLessThan(0)
  await page.close()
})

test('the end roll is mid-scroll partway through and static with reduced motion', async () => {
  const page = await open('#/a/roll/1')
  const top = () => page.evaluate(() => document.querySelector('div[data-scene="roll"] [data-k-endroll-inner]')!.getBoundingClientRect().top)
  const end = await top()
  await page.close()
  const still = await open('#/a/roll/1', true)
  const rows = await still.evaluate(() => [...document.querySelectorAll('div[data-scene="roll"] [data-k-source]')].map((e) => e.getBoundingClientRect().top >= 0 && e.getBoundingClientRect().bottom <= 1080))
  expect(rows.every(Boolean)).toBe(true)
  expect(end).toBeLessThan(0)
  await still.close()
})
