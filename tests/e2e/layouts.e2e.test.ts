import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Browser
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=layouts&instant=1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  return page
}

// The box of `sel` inside the scene, as fractions of the scene's box.
const frac = (page: Page, scene: string, sel: string) =>
  page.evaluate(([scene, sel]) => {
    const s = document.querySelector(`div[data-scene="${scene}"]`)!.getBoundingClientRect()
    const r = document.querySelector(`div[data-scene="${scene}"] ${sel}`)!.getBoundingClientRect()
    return { l: (r.left - s.left) / s.width, t: (r.top - s.top) / s.height, r: (r.right - s.left) / s.width, b: (r.bottom - s.top) / s.height }
  }, [scene, sel])

test('thirds: the media is the right two thirds, the text the left third', async () => {
  const page = await open()
  const img = await frac(page, 'thirds', '[data-k-media] img')
  expect(img.l).toBeCloseTo(1 / 3, 2)
  expect(img.r).toBeGreaterThan(0.9)
  expect(img.r).toBeLessThanOrEqual(1)
  expect((await frac(page, 'thirds', 'h2')).r).toBeLessThan(img.l)
  await page.close()
})

test('full-bleed: the picture covers the frame under a caption on a scrim of at least 0.6', async () => {
  const page = await open()
  await page.evaluate(() => window.klappe.stepper.goto(1, 'cut'))
  const img = await frac(page, 'full', '[data-k-media] img')
  expect(img).toEqual({ l: 0, t: 0, r: 1, b: 1 })
  expect((await frac(page, 'full', 'h2')).t).toBeGreaterThan(0.5)
  const scrim = await page.evaluate(() => {
    const s = [...document.querySelectorAll<HTMLElement>('div[data-scene="full"] [data-k-media] div')].find((d) => d.style.background.includes('--k-scrim'))
    return s ? parseFloat(s.style.opacity) : 0
  })
  expect(scrim).toBeGreaterThanOrEqual(0.6)
  // the caption paints over the picture
  const over = await page.evaluate(() => {
    const sc = document.querySelector('div[data-scene="full"]')!
    return !!(sc.querySelector('[data-k-media]')!.compareDocumentPosition(sc.querySelector('h2')!) & Node.DOCUMENT_POSITION_FOLLOWING)
  })
  expect(over).toBe(true)
  await page.close()
})

test('big-number: the number is set larger than a title, the rest is a footnote under it', async () => {
  const page = await open()
  await page.evaluate(() => window.klappe.stepper.goto(3, 'cut'))
  const { big, title, text } = await page.evaluate(() => {
    const n = document.querySelector<HTMLElement>('div[data-scene="big"] .k-big')!
    return {
      big: parseFloat(getComputedStyle(n).fontSize),
      title: parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--k-size-title')),
      text: n.textContent,
    }
  })
  expect(big).toBeGreaterThan(title)
  expect(text).toBe('42%')
  const num = await frac(page, 'big', '.k-big')
  const note = await frac(page, 'big', 'p[data-step="2"]')
  expect(note.t).toBeGreaterThanOrEqual(num.b - 0.01)
  expect(num.r).toBeLessThanOrEqual(1 - 160 / 1920)
  await page.close()
})

for (const vp of [{ w: 1920, h: 1080 }, { w: 1366, h: 768 }]) {
  test(`the layouts walk clean at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=layouts`, vp)
    expect(r.problems).toEqual([])
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.warnings).toEqual([])
    expect(r.ok).toBe(true)
  })
}
