import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const MISSING = 'sections/10-a/30-missing/scene.ts: IMAGE MISSING: media/gone.png — A picture not made yet'

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}, but for the missing picture`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-wipe`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([MISSING])
  }, 120_000)

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-wipe${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

// The colour at x across the middle of the scene, from a screenshot: grey is the before, blue-green the after.
async function side(page: Page, scene: string, fx: number): Promise<'before' | 'after'> {
  const r = await page.evaluate(([scene, fx]) => {
    const b = document.querySelector(`[data-scene="${scene}"] [data-k-wipe]`)!.getBoundingClientRect()
    return { x: b.x + b.width * (fx as number), y: b.y + b.height * 0.15 }
  }, [scene, fx] as const)
  const png = await page.screenshot({ clip: { x: r.x, y: r.y, width: 2, height: 2 } })
  const [red, , blue] = await page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(img.width, img.height).getContext('2d')!
    c.drawImage(img, 0, 0)
    return [...c.getImageData(0, 0, 1, 1).data]
  }, png.toString('base64'))
  return blue > red + 20 ? 'after' : 'before'
}

test('the after picture sweeps in from the left: none, half, all', async () => {
  const page = await open('#/a/full/1')
  expect([await side(page, 'full', 0.1), await side(page, 'full', 0.9)]).toEqual(['before', 'before'])
  await page.evaluate(() => window.klappe.stepper.next())
  await settle(page)
  expect([await side(page, 'full', 0.4), await side(page, 'full', 0.6)]).toEqual(['after', 'before'])
  await page.evaluate(() => window.klappe.stepper.next())
  await settle(page)
  expect([await side(page, 'full', 0.1), await side(page, 'full', 0.9)]).toEqual(['after', 'after'])
  await page.close()
}, 60_000)

test('the divider sits at the edge of the after picture', async () => {
  const page = await open('#/a/full/2')
  const r = await page.evaluate(() => {
    const w = document.querySelector('[data-scene="full"] [data-k-wipe]')!.getBoundingClientRect()
    const d = document.querySelector('[data-scene="full"] [data-k-wipe-divider]')!.getBoundingClientRect()
    return (d.x + d.width / 2 - w.x) / w.width
  })
  expect(r).toBeCloseTo(0.5, 2)
  await page.close()
})

test('a wipe in a rect stays inside it', async () => {
  const page = await open('#/a/in-rect/2')
  const r = await page.evaluate(() => {
    const scene = document.querySelector('div[data-scene="in-rect"]')!.getBoundingClientRect()
    const w = document.querySelector('[data-scene="in-rect"] [data-k-wipe]')!.getBoundingClientRect()
    const k = scene.width / 1920
    return [(w.x - scene.x) / k, (w.y - scene.y) / k, w.width / k, w.height / k].map(Math.round)
  })
  expect(r).toEqual([960, 200, 800, 450])
  await page.close()
})
