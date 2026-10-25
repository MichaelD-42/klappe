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
    expect(r.problems).toEqual([
      'sections/20-b/section.ts: background: parallax 9 out of range; use a depth above 0, up to 4',
      'sections/20-b/section.ts: background: layer 1: parallax 0 out of range; use a depth above 0, up to 4',
    ])
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

// The near layer's centre moves three times as far as the background's, and its edges stay out of view too.
test('a layer at depth 3 drifts three times as far as the background', async () => {
  const page = await open('#/a/three/1')
  const r = await page.evaluate(() => {
    const s = document.querySelector('.k-stage')!.getBoundingClientRect()
    const off = (sel: string) => {
      const b = document.querySelector(sel)!.getBoundingClientRect()
      return { x: b.left + b.width / 2 - (s.left + s.width / 2), covers: b.left <= s.left && b.right >= s.right && b.top <= s.top && b.bottom >= s.bottom }
    }
    // The layer's frame is see-through: only its picture covers the background.
    const fills = [...document.querySelectorAll('[data-k-background="a"] [data-k-layer="1"] *')].map((e) => getComputedStyle(e).backgroundColor)
    return { base: off('[data-k-background="a"]'), near: off('[data-k-background="a"] [data-k-layer="1"]'), fills: [...new Set(fills)] }
  })
  expect(r.fills).toEqual(['rgba(0, 0, 0, 0)'])
  expect(r.base.x).toBeCloseTo(-40, 0)
  expect(r.near.x).toBeCloseTo(-120, 0)
  expect([r.base.covers, r.near.covers]).toEqual([true, true])
  await page.close()
})
