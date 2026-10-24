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
  // The grow scales the new canvas and clears it at the end; the layer of all canvases is never touched.
  expect(await page.evaluate(() => [...document.querySelectorAll<HTMLElement>('.k-worlds, .k-canvas')].filter((e) => e.style.transform !== '').length)).toBe(0)
  await page.close()
})

// The new canvas grows in while the old one still fades out: the grow must not pull the old canvas back.
test('the old canvas only grows on screen while it shows', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-zoom`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const widths = await page.evaluate(async () => {
    const old = document.querySelectorAll<HTMLElement>('.k-canvas')[0]
    const out: number[] = []
    let done = false
    window.klappe.stepper.next().then(() => (done = true))
    while (!done) {
      if (Number(getComputedStyle(old).opacity) > 0) out.push(old.getBoundingClientRect().width)
      await new Promise(requestAnimationFrame)
    }
    return out
  })
  expect(widths.length).toBeGreaterThan(3)
  expect(widths.filter((w, i) => i > 0 && w < widths[i - 1] - 0.5)).toEqual([])
  await page.close()
})

// The zoom sets a "reveal" label: the target step starts there, so its content shows while the new canvas grows.
test('the first step of the new canvas starts at the reveal label, during the grow', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-zoom`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await page.evaluate(async () => {
    const world = document.querySelectorAll<HTMLElement>('.k-canvas')[1] // the canvas carries the fade
    const title = world.querySelector<HTMLElement>('[data-scene] h2')!
    const stepper = window.klappe.stepper as any
    const samples: [number, number][] = []
    let timing: { reveal: number; delay: number; length: number } | undefined
    let done = false
    stepper.next().then(() => (done = true))
    while (!done) {
      // The move runs: [the transition, the target step]. The step's delay is where it starts in the transition.
      const [tr, step] = stepper.running
      if (!timing && step) timing = { reveal: tr.labels.reveal, delay: step.delay(), length: tr.duration() }
      samples.push([Number(getComputedStyle(world).opacity), Number(getComputedStyle(title).opacity)])
      await new Promise(requestAnimationFrame)
    }
    return { samples, timing }
  })
  // The step starts exactly at the label, which lies before the transition ends.
  expect(r.timing!.delay).toBeCloseTo(r.timing!.reveal, 5)
  expect(r.timing!.reveal).toBeLessThan(r.timing!.length - 0.1)
  // And on screen: some frame shows the canvas still growing (not fully opaque) with the title already partly visible.
  expect(r.samples.some(([w, t]) => w > 0 && w < 1 && t > 0)).toBe(true)
  await page.close()
})

// A zoom into a shared canvas whose first step also flies the camera: the zoom must not fight the camera.
for (const reduced of [false, true])
  for (const vp of [
    { w: 1920, h: 1080 },
    { w: 1366, h: 768 },
    { w: 1024, h: 768 },
  ])
    test(`walk passes on a zoom into a shared canvas at ${vp.w}x${vp.h}${reduced ? ', reduced motion' : ''}`, async () => {
      const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=zoom-shared${reduced ? '&reducedmotion=1' : ''}`, vp)
      expect(r.errors).toEqual([])
      expect(r.problems).toEqual([])
      expect(r.checks.filter((c) => !c.ok)).toEqual([])
      expect(r.ok).toBe(true)
    })
