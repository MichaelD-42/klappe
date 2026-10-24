import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const NO_SIZE = 'glow: target has no size to measure'

// Reduced motion too: breathe then holds steady, and camera moves cut.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-attention${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([NO_SIZE])
  }, 120_000)

async function open(hash: string, query = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-attention${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

// Box 1's glow: whether its steady and its breathing layer show, how many wall-clock loops run on the
// breathing leaf, and whether the glow box frames the box with a margin.
const glowOf = (page: Page) =>
  page.evaluate(() => {
    const scene = document.querySelector('div[data-scene="boxes"]')!
    const wrap = scene.querySelector<HTMLElement>('div[data-k-glow]')!
    const [steady, live] = [...wrap.children] as HTMLElement[]
    const el = [...scene.querySelectorAll('div')].find((d) => d.textContent === 'Box 1')!
    const box = el.getBoundingClientRect()
    const g = wrap.getBoundingClientRect()
    const shows = (e: Element) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    return {
      steady: shows(steady),
      live: shows(live),
      loops: live.querySelector('[data-k-ignore]')!.getAnimations().length,
      behind: wrap.nextElementSibling === el, // earlier in the DOM, so it paints under the box
      frames: g.x < box.x && g.y < box.y && g.right > box.right && g.bottom > box.bottom && box.x - g.x < 30,
    }
  })

test('glow comes on behind the box, breathes on its own loop, then goes off', async () => {
  let page = await open('#/a/boxes/1')
  expect(await glowOf(page)).toEqual({ steady: true, live: false, loops: 1, behind: true, frames: true })
  await page.close()
  page = await open('#/a/boxes/2')
  expect(await glowOf(page)).toMatchObject({ steady: false, live: true })
  await page.close()
  page = await open('#/a/boxes/3')
  expect(await glowOf(page)).toMatchObject({ steady: false, live: false })
  await page.close()
}, 60_000)

test('with reduced motion, breathe holds a steady glow', async () => {
  const page = await open('#/a/boxes/2', '&reducedmotion=1')
  expect(await glowOf(page)).toMatchObject({ live: true, loops: 0 })
  await page.close()
}, 60_000)

test('pulse shows a ring that is gone at the end of its step; shake ends at rest', async () => {
  const page = await open('#/a/boxes/3')
  const ring = () => page.evaluate(() => getComputedStyle(document.querySelector('[data-scene="boxes"] [data-k-pulse]')!).visibility)
  const x = () =>
    page.evaluate(() => {
      const box = [...document.querySelectorAll<HTMLElement>('[data-scene="boxes"] div')].find((d) => d.textContent === 'Box 2')!
      return new DOMMatrix(getComputedStyle(box).transform).e
    })
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(150)
  expect(await ring()).toBe('visible')
  await page.waitForTimeout(1200)
  expect(await ring()).toBe('hidden')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(100)
  expect(Math.abs(await x())).toBeGreaterThan(1)
  await page.waitForTimeout(900)
  expect(await x()).toBeCloseTo(0)
  await page.close()
}, 60_000)

test('an SVG target glows through blurred copies of itself', async () => {
  const page = await open('#/a/boxes/6')
  const r = await page.evaluate(() => {
    const scene = document.querySelector('g[data-scene="boxes"]')!
    const wrap = scene.querySelector('g[data-k-glow]')!
    return { circles: scene.querySelectorAll('circle').length, shows: wrap.firstElementChild!.checkVisibility({ opacityProperty: true, visibilityProperty: true }) }
  })
  expect(r).toEqual({ circles: 3, shows: true })
  await page.close()
}, 60_000)
