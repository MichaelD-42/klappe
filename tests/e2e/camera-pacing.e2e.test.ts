import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

test('camera pacing walks clean, and an unknown ease is a problem', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=camera-pacing`)
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems).toEqual(['sections/10-a/40-odd/scene.ts step 1: camera: unknown ease "wobbly"; using power2.inOut'])
})

async function open(): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=camera-pacing`)
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  return page
}

// The world's x, its filter and the blur's strength at time t of the canvas timeline.
const at = (page: Page, t: number) =>
  page.evaluate((t) => {
    const c = window.klappe.canvases[0]
    c.tl.seek(t, false)
    const blur = document.querySelector('#k-whip-blur feGaussianBlur')?.getAttribute('stdDeviation') ?? ''
    return { x: new DOMMatrix(getComputedStyle(c.world).transform).e, filter: c.world.style.filter, blur: Math.max(0, ...blur.split(/\s+/).map(Number)) }
  }, t)
const labels = (page: Page) => page.evaluate(() => window.klappe.canvases[0].tl.labels as Record<string, number>)

test('a whip is a short flight that blurs along its way and lands sharp', async () => {
  const page = await open()
  const l = await labels(page)
  const flight = 1.6 * 0.3 // a share of the camera time
  const mid = await at(page, l['e:0'] + 0.001 + flight / 2)
  expect(mid.filter).toContain('k-whip-blur')
  expect(mid.blur).toBeGreaterThan(5)
  const landed = await at(page, l['e:0'] + 0.001 + flight + 0.01)
  const end = await at(page, l['e:1'])
  expect(landed).toEqual({ ...end, blur: landed.blur })
  expect(end.filter).toBe('')
  expect((await at(page, l['e:0'])).filter).toBe('')
  await page.evaluate(() => window.klappe.stepper.goto(0, 'cut')) // a seek back leaves it sharp
  expect((await at(page, l['e:0'])).filter).toBe('')
  await page.close()
})

test('a scene sets its entry flight: 3 s linear', async () => {
  const page = await open()
  const l = await labels(page)
  expect(l['e:2'] - l['e:1']).toBeGreaterThanOrEqual(3)
  const [a, b] = [await at(page, l['e:1']), await at(page, l['e:2'])]
  const half = await at(page, l['e:1'] + 0.001 + 1.5) // past the step's padding
  expect(half.x).toBeCloseTo((a.x + b.x) / 2, -1)
  await page.close()
})
