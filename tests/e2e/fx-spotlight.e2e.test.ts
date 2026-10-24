import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const NO_SIZE = 'spotlight: target has no size to measure'

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-spotlight`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([NO_SIZE])
  }, 120_000)

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-spotlight${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

// The hole's box, and the box of what it should frame, in page pixels.
const frames = (page: Page, n: number) =>
  page.evaluate((n) => {
    const hole = document.querySelector<HTMLElement>('[data-scene="boxes"] [data-k-spotlight-hole]')!
    const box = [...document.querySelectorAll<HTMLElement>('[data-scene="boxes"] div')].find((d) => d.textContent === `Box ${n}`)!
    const shown = hole.closest<HTMLElement>('[data-k-spotlight]')!.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    const r = (e: Element) => (({ x, y, width, height }) => ({ x, y, width, height }))(e.getBoundingClientRect())
    return { hole: r(hole), box: r(box), shown }
  }, n)

// The hole frames its target with a margin on every side.
const frames_ = (f: Awaited<ReturnType<typeof frames>>) =>
  f.hole.x < f.box.x && f.hole.y < f.box.y && f.hole.x + f.hole.width > f.box.x + f.box.width && f.hole.y + f.hole.height > f.box.y + f.box.height &&
  f.box.x - f.hole.x < 40

test('the spotlight frames the first box, moves to the second, then to a rect, and lifts', async () => {
  for (const [step, n] of [[2, 1], [3, 2], [4, 3]] as const) {
    const page = await open(`#/a/boxes/${step}`)
    const f = await frames(page, n)
    expect(f.shown).toBe(true)
    expect(frames_(f)).toBe(true)
    await page.close()
  }
  const page = await open('#/a/boxes/5')
  expect((await frames(page, 1)).shown).toBe(false)
  await page.close()
}, 60_000)

// A pixel in the middle of box 1, from a screenshot: bright inside the hole, dimmed outside it.
const brightness = async (page: Page) => {
  const b = await page.evaluate(() => {
    const e = [...document.querySelectorAll<HTMLElement>('[data-scene="boxes"] div')].find((d) => d.textContent === 'Box 1')!.getBoundingClientRect()
    return { x: e.x + 10, y: e.y + 10 }
  })
  const png = await page.screenshot({ clip: { x: b.x, y: b.y, width: 4, height: 4 } })
  return page.evaluate(async (b64) => {
    const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
    const c = new OffscreenCanvas(img.width, img.height).getContext('2d')!
    c.drawImage(img, 0, 0)
    const [r, g, b] = c.getImageData(0, 0, 1, 1).data
    return r + g + b
  }, png.toString('base64'))
}

test('outside the hole the scene is dimmed', async () => {
  const lit = await open('#/a/boxes/2')
  const inside = await brightness(lit)
  await lit.close()
  const dim = await open('#/a/boxes/3')
  const outside = await brightness(dim)
  await dim.close()
  expect(outside).toBeLessThan(inside * 0.5)
}, 60_000)
