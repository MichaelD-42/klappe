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
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-camera-moves${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

// With clock, the page runs on a fake clock that only moves with page.clock.runFor, as in fx-camera.
async function open(hash: string, query = '', clock = false): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  if (clock) await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-camera-moves${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await (clock ? page.clock.runFor(500) : page.waitForTimeout(300))
  return page
}
const next = (page: Page) => page.evaluate(() => void window.klappe.stepper.next())
const prev = (page: Page) => page.evaluate(() => void window.klappe.stepper.prev())
const r2 = (v: number) => Math.round(v * 100) / 100

// The boxes' opacity and blur, the box 1 screen box, the camera pose, the canvas lean and the background scale.
const state = (page: Page) =>
  page.evaluate(() => {
    const m = (e: Element) => new DOMMatrix(getComputedStyle(e).transform)
    const canvas = [...document.querySelectorAll('.k-canvas')].find((c) => getComputedStyle(c).visibility !== 'hidden')!
    const world = canvas.querySelector('.k-world')!
    const box = (i: number) => canvas.querySelectorAll(`[data-box="${i}"]`)
    const look = [0, 1, 2].map((i) => `${getComputedStyle(box(i)[0]).opacity} ${getComputedStyle(box(i)[0]).filter}`)
    const b = box(1)[1]?.getBoundingClientRect() // the dolly scene's box 1
    const lean = m(canvas)
    return {
      look,
      box: b ? [b.left, b.top, b.width, b.height].map(Math.round) : [],
      cam: [m(world).a, m(world).e, m(world).f],
      // A rotateY leaves m13 non-zero; flat is 0.
      lean: Math.abs(lean.m13) + Math.abs(lean.m23),
      flat: lean.isIdentity, // no perspective left behind either
      bg: m(canvas.firstElementChild!).a,
    }
  })

test('rackFocus: a deep link, a walk and a step back show the same focus', async () => {
  const page = await open('#/a/rack/1')
  expect((await state(page)).look).toEqual(Array(3).fill('1 blur(0px)'))
  await next(page)
  await page.waitForTimeout(1200)
  const walked = (await state(page)).look
  expect(walked).toEqual(['1 blur(0px)', '0.6 blur(6px)', '0.6 blur(6px)'])
  await next(page)
  await page.waitForTimeout(1200)
  expect((await state(page)).look).toEqual(['0.6 blur(6px)', '0.6 blur(6px)', '1 blur(0px)'])
  await prev(page)
  await page.waitForTimeout(300)
  expect((await state(page)).look).toEqual(walked)
  const deep = await open('#/a/rack/2')
  expect((await state(deep)).look).toEqual(walked)
  await page.close()
  await deep.close()
}, 60_000)

test('dollyZoom: box 1 holds its size and place while the camera pulls back and the background grows', async () => {
  const page = await open('#/a/dolly/1', '', true)
  const rest = await state(page)
  expect(r2(rest.bg)).toBe(1)
  await next(page)
  await page.clock.runFor(1000) // mid-move
  const mid = await state(page)
  expect(mid.cam[0]).toBeLessThan(0.9)
  expect(mid.bg).toBeGreaterThan(1.1)
  mid.box.forEach((v, i) => expect(Math.abs(v - rest.box[i])).toBeLessThanOrEqual(1))
  await page.clock.runFor(1500)
  const walked = await state(page)
  expect(r2(walked.cam[0])).toBe(0.5)
  expect(r2(walked.bg)).toBe(2)
  expect(walked.box).toEqual(rest.box)

  const deep = await open('#/a/dolly/2')
  expect(await state(deep)).toEqual(walked)
  await next(deep)
  await deep.waitForTimeout(3500) // a 2 s move, with room for a busy machine
  const back = await state(deep)
  expect([r2(back.cam[0]), r2(back.bg)]).toEqual([1, 1])
  await prev(deep)
  await deep.waitForTimeout(300)
  expect(await state(deep)).toEqual(walked)
  await prev(deep)
  await deep.waitForTimeout(300)
  expect([r2((await state(deep)).cam[0]), r2((await state(deep)).bg)]).toEqual([1, 1])
  await page.close()
  await deep.close()
}, 60_000)

test('tilt: the canvas leans mid-flight and lands flat; a deep link and a step back are flat', async () => {
  const page = await open('#/a/lean/1', '', true)
  expect((await state(page)).lean).toBe(0)
  await next(page)
  await page.clock.runFor(600)
  expect((await state(page)).lean).toBeGreaterThan(0.02)
  await page.clock.runFor(2500)
  const walked = await state(page)
  expect([walked.lean, walked.flat]).toEqual([0, true])
  const deep = await open('#/a/lean/2')
  expect(await state(deep)).toEqual(walked)
  await next(deep)
  await deep.waitForTimeout(2500)
  await prev(deep)
  await deep.waitForTimeout(300)
  expect(await state(deep)).toEqual(walked)
  await page.close()
  await deep.close()
}, 60_000)

// A review harness once hung after pausing a tilt ~50 ms in and seeking the lean tween with .time().
test('a tilt paused mid-flight can be seeked with time() without hanging', async () => {
  const page = await open('#/a/lean/1')
  await next(page)
  await page.waitForTimeout(50)
  const seek = page.evaluate(() => {
    const tl = window.klappe.canvases.find((c: any) => c.el.hasAttribute('data-k-active')).tl
    const lean = tl.getChildren(true, true, false).find((t: any) => 'rotationX' in t.vars)
    lean.pause()
    for (const t of [0.05, 0.4, 0, lean.duration(), 0.8]) lean.time(t)
    tl.pause()
    tl.time(tl.time() + 0.05)
    return 'done'
  })
  const hung = new Promise((r) => setTimeout(() => r('hung'), 5_000))
  expect(await Promise.race([seek, hung])).toBe('done')
  await page.close()
})

test('with reduced motion, nothing leans, the dolly cuts to its end and the focus still blurs', async () => {
  const page = await open('#/a/lean/1', '&reducedmotion=1', true)
  await next(page)
  await page.clock.runFor(30)
  expect((await state(page)).lean).toBe(0)
  const dolly = await open('#/a/dolly/1', '&reducedmotion=1', true)
  const rest = await state(dolly)
  await next(dolly)
  await dolly.clock.runFor(30)
  const s = await state(dolly)
  expect([r2(s.cam[0]), r2(s.bg)]).toEqual([0.5, 2])
  expect(s.box).toEqual(rest.box)
  const rack = await open('#/a/rack/2', '&reducedmotion=1')
  expect((await state(rack)).look[1]).toBe('0.6 blur(6px)')
  await page.close()
  await dolly.close()
  await rack.close()
}, 60_000)
