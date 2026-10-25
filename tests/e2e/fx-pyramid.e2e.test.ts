import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The stack's over-long label and its next() past the top are the fixture's problems.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1024, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek and pyramid text is legible at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-pyramid${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['pyramid: label of "long" too long', 'pyramid: next() past the top layer (2 layers)'])
  }, 120_000)

async function open(hash: string, q = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-pyramid${q}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

// The layers that show, and the one in the accent (its accent polygon shows), in a scene.
const state = (page: Page, scene: string) =>
  page.evaluate((scene) => {
    const shows = (e: Element) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    const layers = [...document.querySelectorAll(`[data-scene="${scene}"] [data-k-pyramid-layer]`)]
    return {
      built: layers.filter(shows).map((g) => g.getAttribute('data-k-pyramid-layer')),
      hot: layers.filter((g) => shows(g.children[1])).map((g) => g.getAttribute('data-k-pyramid-layer')),
    }
  }, scene)

test('layers build bottom-up; the newest is in the accent and the one below settles', async () => {
  const page = await open('#/a/walk/1')
  expect(await state(page, 'walk')).toEqual({ built: ['unit'], hot: ['unit'] })
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.waitForTimeout(1000)
  expect(await state(page, 'walk')).toEqual({ built: ['unit', 'int'], hot: ['int'] })
  const ys = await page.evaluate(() => [...document.querySelectorAll('[data-scene="walk"] [data-k-pyramid-layer]')].slice(0, 2).map((g) => g.getBoundingClientRect().top))
  expect(ys[1]).toBeLessThan(ys[0])
  await page.close()
}, 60_000)

// The early scene makes its second next() adder first: the layer is picked when the step is added, so step 1
// still builds the bottom layer.
test('next adders built out of step order still build bottom-up', async () => {
  const page = await open('#/a/early/1')
  expect(await state(page, 'early')).toEqual({ built: ['unit'], hot: ['unit'] })
  await page.close()
}, 60_000)

// Mid-step, a layer grows from its base (scaleY under 1); with reduced motion it fades in at full size.
test('with reduced motion, a layer fades in at full size instead of growing', async () => {
  for (const [q, grows] of [['', true], ['&reducedmotion=1', false]] as const) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.clock.install()
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-pyramid${q}#/a/walk/1`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await page.clock.runFor(500)
    await page.evaluate(() => void window.klappe.stepper.next())
    await page.clock.runFor(200)
    const scale = await page.evaluate(() => {
      const g = document.querySelector<SVGGElement>('[data-scene="walk"] [data-k-pyramid-layer="int"]')!
      // GSAP writes an SVG element's transform as its attribute.
      return g.transform.baseVal.consolidate()?.matrix.d ?? 1
    })
    expect(scale < 0.99, q).toBe(grows)
    await page.close()
  }
}, 60_000)

// A next() past the top builds nothing, but its step still takes a beat, like every other empty step.
test('a next() past the top layer still takes a beat', async () => {
  const page = await open('#/a/stack/3')
  const span = await page.evaluate(() => {
    const { canvases, steps } = window.klappe
    const i = steps.findIndex((s: any) => s.scene === 'stack' && s.step === 3)
    const tl = canvases[steps[i].canvas].tl
    return tl.labels[`e:${i}`] - tl.labels[`e:${i - 1}`]
  })
  expect(span).toBeGreaterThanOrEqual(0.4)
  await page.close()
}, 60_000)
