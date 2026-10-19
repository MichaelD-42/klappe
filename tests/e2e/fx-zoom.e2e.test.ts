import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk passes across two zoom transitions at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-zoom`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.ok).toBe(true)
  })

test('the zoom keeps the old canvas pose and leaves it hidden', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-zoom`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const worlds = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('.k-world')].map((w) => [w.style.transform, getComputedStyle(w).visibility]),
    )
  const before = await worlds()
  await page.evaluate(() => window.klappe.stepper.next()) // resolves when the move, transition included, is done
  const after = await worlds()
  expect(after[0][1]).toBe('hidden')
  expect(after[0][0]).toBe(before[0][0])
  expect(after[1][1]).toBe('visible')
  await page.close()
})

// The zoom sets a "reveal" label: the target step starts there, so its content shows while the new canvas grows.
test('the first step of the new canvas starts at the reveal label, during the grow', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-zoom`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const samples = await page.evaluate(async () => {
    const world = document.querySelectorAll<HTMLElement>('.k-world')[1]
    const title = world.querySelector<HTMLElement>('[data-scene] h2')!
    const out: [number, number][] = []
    let done = false
    window.klappe.stepper.next().then(() => (done = true))
    while (!done) {
      out.push([Number(getComputedStyle(world).opacity), Number(getComputedStyle(title).opacity)])
      await new Promise(requestAnimationFrame)
    }
    return out
  })
  // Some frame shows the canvas still growing (not fully opaque) with the title already partly visible.
  expect(samples.some(([w, t]) => w > 0 && w < 1 && t > 0)).toBe(true)
  await page.close()
})
