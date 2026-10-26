import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const MISSING = 'sections/10-a/20-missing/scene.ts: IMAGE MISSING: media/gone.png — A picture not made yet'

for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-loupe${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([MISSING])
  }, 120_000)

// The page runs on a fake clock that only moves with page.clock.runFor, as in fx-travel.
async function open(hash: string, query = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-loupe${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  return page
}

// The lens centre in scene units, and the picture point the copy shows there: rect + (r - copy offset) / zoom.
// Rect (160, 90), r 150 and zoom 2, as in the fixture.
const state = (page: Page) =>
  page.evaluate(() => {
    const xy = (sel: string) => {
      const m = new DOMMatrix(getComputedStyle(document.querySelector(sel)!).transform)
      return [m.e, m.f]
    }
    const [lx, ly] = xy('[data-k-loupe]')
    const [cx, cy] = xy('[data-k-loupe-copy]')
    return {
      lens: [Math.round(lx + 150 + 160), Math.round(ly + 150 + 90)],
      shows: [Math.round((150 - cx) / 2 + 160), Math.round((150 - cy) / 2 + 90)],
    }
  })

test('the lens shows the detail under its centre, then slides to the next two in step order', async () => {
  const page = await open('#/a/lens/1')
  expect(await state(page)).toEqual({ lens: [560, 390], shows: [560, 390] })
  await page.evaluate(() => void window.klappe.stepper.next())
  // The move starts where the lens is: a start read when the adders were made (the later one first) would jump.
  await page.clock.runFor(20)
  const early = await state(page)
  expect(Math.abs(early.lens[0] - 560) + Math.abs(early.lens[1] - 390)).toBeLessThan(10)
  await page.clock.runFor(580)
  const mid = await state(page)
  expect(mid.lens[0]).toBeGreaterThan(560)
  expect(mid.lens[0]).toBeLessThan(1360)
  expect(mid.shows).toEqual(mid.lens)
  await page.clock.runFor(1500)
  expect(await state(page)).toEqual({ lens: [1360, 690], shows: [1360, 690] })
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(2000)
  expect(await state(page)).toEqual({ lens: [960, 540], shows: [960, 540] })
  await page.close()
}, 60_000)

test('with reduced motion, the lens cuts to the next detail', async () => {
  const page = await open('#/a/lens/1', '&reducedmotion=1')
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(100)
  expect(await state(page)).toEqual({ lens: [1360, 690], shows: [1360, 690] })
  await page.close()
}, 60_000)
