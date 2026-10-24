import { chromium, type Page } from '@playwright/test'
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
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-parallax`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

async function open(hash: string, flags = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-parallax${flags}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

// The background's drift from rest, and whether it still covers the whole stage.
const pose = (page: Page) =>
  page.evaluate(() => {
    const bg = document.querySelector<HTMLElement>('[data-k-background="a"]')!
    const m = new DOMMatrix(getComputedStyle(bg).transform)
    const r = bg.getBoundingClientRect()
    const s = document.querySelector('.k-stage')!.getBoundingClientRect()
    return { x: Math.round(m.e), covers: r.left <= s.left && r.right >= s.right && r.top <= s.top && r.bottom >= s.bottom }
  })

test('the picture drifts with the camera, the way the content moves, and never shows an edge', async () => {
  const first = await open('#/a/one/1')
  const a = await pose(first)
  // Play the flights to the last scene.
  for (let k = 0; k < 2; k++) await first.evaluate(() => window.klappe.stepper.next())
  const c = await pose(first)
  await first.close()
  expect(a.x).toBeGreaterThan(0)
  expect(c.x).toBeLessThan(0)
  expect(Math.max(Math.abs(a.x), Math.abs(c.x))).toBeLessThanOrEqual(40)
  expect([a.covers, c.covers]).toEqual([true, true])
}, 60_000)

test('a deep link lands the picture where the flights would have', async () => {
  const page = await open('#/a/three/1')
  expect((await pose(page)).x).toBe(-40)
  await page.close()
})

test('with reduced motion the picture still takes its place, at once', async () => {
  const page = await open('#/a/one/1', '&reducedmotion=1')
  await page.evaluate(() => window.klappe.stepper.next())
  expect((await pose(page)).x).toBe(0)
  await page.close()
})
