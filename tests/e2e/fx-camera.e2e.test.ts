import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-camera${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

// With clock, the page runs on a fake clock that only moves with page.clock.runFor, as in fx-travel.
async function open(hash: string, query = '', clock = false): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  if (clock) await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-camera${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await (clock ? page.clock.runFor(500) : page.waitForTimeout(300))
  return page
}

// The camera pose (the world's transform), the parcel's centre on screen, and the shake on the world's layers.
const state = (page: Page) =>
  page.evaluate(() => {
    const world = document.querySelector<HTMLElement>('.k-world')!
    const m = new DOMMatrix(getComputedStyle(world).transform)
    const b = document.querySelector('[data-parcel] div')!.getBoundingClientRect()
    const shake = [...world.children].map((c) => new DOMMatrix(getComputedStyle(c).transform).f)
    return {
      cam: [m.a, m.e, m.f].map((v) => Math.round(v * 100) / 100),
      parcel: [b.left + b.width / 2, b.top + b.height / 2].map(Math.round),
      shake: shake.map((v) => Math.round(v * 10) / 10),
    }
  })
const next = (page: Page) => page.evaluate(() => void window.klappe.stepper.next())
const prev = (page: Page) => page.evaluate(() => void window.klappe.stepper.prev())

test('the camera follows the parcel, holds it centred, and the scene jolts when it lands', async () => {
  const page = await open('#/a/ride/1', '', true)
  const rest = await state(page)
  expect(rest.cam).toEqual([1, -1920, 0])
  await next(page)
  await page.clock.runFor(1200) // past the close-in: the parcel sits at the stage centre
  const mid = await state(page)
  expect(mid.cam[0]).toBeCloseTo(1.6)
  expect(mid.parcel.map((v, i) => Math.abs(v - [960, 540][i]) <= 2)).toEqual([true, true])
  // The shake is a damped wave: one sample can land near a zero crossing if the play starts a frame late on a busy
  // machine, so take its peak over the window the shake runs in.
  let peak = 0
  for (let t = 0; t < 1500; t += 50) {
    await page.clock.runFor(50)
    peak = Math.max(peak, ...(await state(page)).shake.map(Math.abs))
  }
  expect(peak).toBeGreaterThan(1)
  await page.clock.runFor(1000)
  const walked = await state(page)
  expect(walked.shake).toEqual([0, 0])
  expect(walked.parcel).toEqual([960, 540])

  // A deep link lands where the walk did; a step back from the next step too.
  const deep = await open('#/a/ride/2')
  expect(await state(deep)).toEqual(walked)
  await next(deep)
  await settle(deep)
  expect((await state(deep)).cam).toEqual(rest.cam) // the next step flies back to the scene's frame
  await prev(deep)
  await settle(deep)
  expect(await state(deep)).toEqual(walked)
  await prev(deep)
  await settle(deep)
  expect((await state(deep)).cam).toEqual(rest.cam)
  await page.close()
  await deep.close()
}, 60_000)

test('with reduced motion, the camera cuts to the end frame and nothing shakes', async () => {
  const page = await open('#/a/ride/1', '&reducedmotion=1', true)
  await next(page)
  await page.clock.runFor(30)
  const s = await state(page)
  expect(s.parcel).toEqual([960, 540])
  expect(s.cam[0]).toBeCloseTo(1.6)
  expect(s.shake).toEqual([0, 0])
  await page.close()
}, 60_000)

// Reduced motion cuts the follow; the parallax picture under it still lands where the full follow takes it.
test('after a follow, the parallax background sits where it does with full motion, also with reduced motion', async () => {
  const drift = async (query: string) => {
    const page = await open('#/a/ride/2', query, true)
    const m = await page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-k-background="a"]')!).transform))
    await page.close()
    return [m.e, m.f].map((v) => Math.round(v))
  }
  const full = await drift('')
  expect(full).not.toEqual([0, 0]) // the follow moved it
  expect(await drift('&reducedmotion=1')).toEqual(full)
})
