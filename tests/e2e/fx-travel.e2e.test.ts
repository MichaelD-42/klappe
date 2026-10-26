import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-travel${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['sections/10-a/30-no-length/scene.ts: travel: path has no length'])
  }, 120_000)

// With clock, the page runs on a fake clock that only moves with page.clock.runFor, as in fx-reveal.
async function open(hash: string, query = '', clock = false): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  if (clock) await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-travel${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await (clock ? page.clock.runFor(500) : page.waitForTimeout(300))
  return page
}

// The parcel's place in scene units (its transform) and how much of the route shows (1 - the dash offset).
const state = (page: Page) =>
  page.evaluate(() => {
    const m = new DOMMatrix(getComputedStyle(document.querySelector('[data-parcel]')!).transform)
    const route = document.querySelector<SVGPathElement>('[data-k-route]')!
    return { x: Math.round(m.e), y: Math.round(m.f), drawn: 1 - parseFloat(getComputedStyle(route).strokeDashoffset) }
  })

test('the parcel waits at the start, travels with the route drawing behind it, and ends at the end', async () => {
  const page = await open('#/a/parcel/1', '', true)
  expect(await state(page)).toEqual({ x: 200, y: 540, drawn: 0 })
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(1000)
  const mid = await state(page)
  expect(mid.drawn).toBeGreaterThan(0.1)
  expect(mid.drawn).toBeLessThan(0.9)
  expect(mid.x).toBeGreaterThan(200)
  await page.clock.runFor(1500)
  expect(await state(page)).toEqual({ x: 960, y: 900, drawn: 1 })
  await page.close()
}, 60_000)

test('with reduced motion, the parcel jumps to the end', async () => {
  const page = await open('#/a/parcel/1', '&reducedmotion=1', true)
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(100)
  expect(await state(page)).toEqual({ x: 960, y: 900, drawn: 1 })
  await page.close()
}, 60_000)

test('an SVG element travels a path element of the scene, turning along it', async () => {
  const page = await open('#/a/given/1')
  const r = await page.evaluate(() => {
    const dot = document.querySelector<SVGGraphicsElement>('[data-dot]')!
    const m = dot.transform.baseVal.consolidate()!.matrix
    return { x: Math.round(m.e), y: Math.round(m.f), turned: Math.abs(m.b) > 0.1 }
  })
  expect(r).toEqual({ x: 1600, y: 600, turned: true })
  await page.close()
}, 60_000)
