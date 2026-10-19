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
  test(`fx-icons walks clean at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-icons`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.ok).toBe(true)
    expect(r.steps).toBe(4)
  })

test('icons draw on with the v2 treatment and tiles fade in, play or cut', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-icons`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const at = (i: number) =>
    page.evaluate(async (i) => {
      await window.klappe.stepper.goto(i, 'cut')
      const shapes = (scene: string) => [...document.querySelectorAll(`g[data-scene="${scene}"] .k-icon :is(path, rect, circle, line)`)]
      const icons = shapes('icons')
      const well = document.querySelector('g[data-scene="tiles"] .k-tile rect[fill^="url"]')!
      return {
        count: icons.length,
        nonScaling: icons.every((s) => s.getAttribute('vector-effect') === 'non-scaling-stroke' && s.getAttribute('stroke-width') === '2'),
        tints: icons.filter((s) => s.getAttribute('fill') === 'currentColor').map((s) => getComputedStyle(s).fillOpacity),
        iconDash: icons.map((s) => getComputedStyle(s).strokeDasharray),
        tileDash: shapes('tiles').map((s) => getComputedStyle(s).strokeDasharray),
        wellOpacity: getComputedStyle(well).opacity,
      }
    }, i)
  const drawn = await at(0)
  expect(drawn.count).toBeGreaterThan(10)
  expect(drawn.nonScaling).toBe(true)
  expect(drawn.tints.length).toBeGreaterThan(0)
  expect(drawn.tints.every((o) => o === '0.2')).toBe(true)
  expect(drawn.iconDash.every((a) => a === 'none')).toBe(true)
  expect(drawn.tileDash.every((a) => a !== 'none')).toBe(true) // the tiles' step is next
  expect(drawn.wellOpacity).toBe('0')
  const lit = await at(1)
  expect(lit.tints.every((o) => o === '0.45')).toBe(true)
  const tiles = await at(2)
  expect(tiles.tileDash.every((a) => a === 'none')).toBe(true)
  expect(tiles.wellOpacity).toBe('1')
  await page.close()
})
