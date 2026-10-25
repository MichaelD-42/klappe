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
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-pointer`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['pointer: type field has no size to measure'])
  }, 120_000)

// The tip lands on the field's centre, the text is typed into it, then the tip moves on to the button point.
test('the pointer moves to its targets and types into the field', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-pointer#/a/walk/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await page.waitForTimeout(500)
    return page.evaluate(() => {
      const tip = document.querySelector('[data-k-pointer] path')!.getBoundingClientRect()
      const field = document.querySelector('[data-scene="walk"] > div')!.getBoundingClientRect()
      const typed = document.querySelector<HTMLElement>('[data-scene="walk"] [data-k-text]')
      return { tip: { x: tip.left, y: tip.top }, field: { x: field.left + field.width / 2, y: field.top + field.height / 2 }, text: typed?.textContent, shown: typed ? getComputedStyle(typed).visibility : '' }
    })
  }
  const typed = await at(2)
  // The tip is the path's top left, give or take its stroke.
  expect(Math.abs(typed.tip.x - typed.field.x)).toBeLessThan(4)
  expect(Math.abs(typed.tip.y - typed.field.y)).toBeLessThan(4)
  expect([typed.text, typed.shown]).toEqual(['ada@example.com', 'visible'])
  const before = await at(1)
  expect(before.shown).toBe('hidden')
  await page.close()
}, 60_000)
