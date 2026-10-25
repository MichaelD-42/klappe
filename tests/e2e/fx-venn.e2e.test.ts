import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1024, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek and venn text is legible at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-venn${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

async function open(hash: string, q = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-venn${q}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

// Which region fills show, which region labels show, in a scene.
const state = (page: Page, scene: string) =>
  page.evaluate((scene) => {
    const shows = (e: Element) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    const pick = (attr: string) => [...document.querySelectorAll(`[data-scene="${scene}"] [${attr}]`)].filter(shows).map((e) => e.getAttribute(attr))
    return { lit: pick('data-k-venn-region'), labels: pick('data-k-venn-label') }
  }, scene)

test('each light settles the region before it; region labels stay once shown', async () => {
  const page = await open('#/a/walk/2')
  expect(await state(page, 'walk')).toEqual({ lit: ['a'], labels: ['a'] })
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.waitForTimeout(1000)
  expect(await state(page, 'walk')).toEqual({ lit: ['a+b'], labels: ['a', 'a+b'] })
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.waitForTimeout(1000)
  expect(await state(page, 'walk')).toEqual({ lit: ['a+b+c'], labels: ['a', 'a+b', 'a+b+c'] })
  await page.close()
}, 60_000)

// The fill is clipped to the region exactly: with a+b lit, its own spot is tinted, but the a-only spot and the
// centre (in all three) are the plain background. Labels are hidden first so only the fill shows at each spot.
test('a lit overlap tints only that region', async () => {
  const page = await open('#/a/walk/3')
  await page.evaluate(() => document.querySelectorAll<HTMLElement>('[data-scene="walk"] [data-k-venn-label]').forEach((e) => (e.style.visibility = 'hidden')))
  await page.waitForTimeout(100)
  const spots = await page.evaluate(() => {
    const at = (k: string) => {
      const r = document.querySelector(`[data-scene="walk"] [data-k-venn-label="${k}"]`)!.getBoundingClientRect()
      return [r.left + r.width / 2, r.top + r.height / 2]
    }
    const ring = document.querySelector('[data-scene="walk"] [data-k-venn-set="a"]')!.getBoundingClientRect()
    return { pair: at('a+b'), single: at('a'), all: at('a+b+c'), outside: [ring.left + 10, ring.top + 10] }
  })
  const png = await page.screenshot()
  const px = await page.evaluate(
    async ({ src, spots }) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const c = new OffscreenCanvas(img.width, img.height).getContext('2d')!
      c.drawImage(img, 0, 0)
      return Object.fromEntries(Object.entries(spots).map(([k, [x, y]]) => [k, [...c.getImageData(Math.round(x), Math.round(y), 1, 1).data.slice(0, 3)]]))
    },
    { src: `data:image/png;base64,${png.toString('base64')}`, spots },
  )
  const same = (a: number[], b: number[]) => a.every((v, k) => Math.abs(v - b[k]) < 6)
  expect({ pair: same(px.pair, px.outside), single: same(px.single, px.outside), all: same(px.all, px.outside) }).toEqual({ pair: false, single: true, all: true })
  await page.close()
}, 60_000)

// The early scene makes the pair's adder before the single circle's: the settle is picked when the step is added,
// so the single circle lights at step 2 and settles when the pair lights at step 3.
test('light adders built out of step order still settle in step order', async () => {
  for (const [step, lit] of [[2, ['a']], [3, ['a+b']]] as const) {
    const page = await open(`#/a/early/${step}`)
    expect((await state(page, 'early')).lit).toEqual(lit)
    await page.close()
  }
}, 60_000)

// Playing into the two-set scene: its outlines draw on (a dash while they draw); with reduced motion they fade in
// whole and never take a dash. Sampled through the camera move into the scene and the step after it.
test('with reduced motion, the circles fade in instead of drawing on', async () => {
  for (const [q, draws] of [['', true], ['&reducedmotion=1', false]] as const) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.clock.install()
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-venn${q}#/a/walk/5`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await page.clock.runFor(500)
    await page.evaluate(() => void window.klappe.stepper.next())
    let dashed = false
    for (let k = 0; k < 20; k++) {
      await page.clock.runFor(200)
      const d = await page.evaluate(() => [...document.querySelectorAll('[data-scene="two"] [data-k-venn-set]')].map((e) => [getComputedStyle(e).strokeDasharray, +getComputedStyle(e).opacity]))
      dashed ||= d.some(([dash, op]) => dash !== 'none' && (op as number) > 0)
    }
    expect(dashed, q).toBe(draws)
    await page.close()
  }
}, 60_000)
