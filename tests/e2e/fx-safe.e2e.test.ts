import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// Default bigType and lowerThird follow the deck's safe-area; the default deck keeps 48 / 64.
async function inset(fixture: string) {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=${fixture}#/a/${fixture === 'fx-safe' ? 'b' : 'word'}/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page.evaluate(() => {
    const scene = document.querySelector('div[data-scene]')!.getBoundingClientRect()
    const rel = (e: Element) => {
      const r = e.getBoundingClientRect()
      return { l: r.left - scene.left, t: r.top - scene.top, r: scene.right - r.right, b: scene.bottom - r.bottom }
    }
    const lt = document.querySelector('[data-k-lowerthird]')
    return { text: rel(document.querySelector('div[data-scene] svg text')!), lt: lt && rel(lt) }
  })
}

test('a default bigType and lowerThird sit inside safe-area [100, 200]', async () => {
  const [safe, plain] = [await inset('fx-safe'), await inset('fx-bigtype')]
  // The lower third's box is exact; the SVG text box carries side bearings, so the word is compared with the default deck's.
  expect(safe.lt!.l).toBeGreaterThanOrEqual(199.5)
  expect(safe.lt!.b).toBeGreaterThanOrEqual(99.5)
  // 136 px more on each side than at 64 px, to within the fit's rounding.
  expect(safe.text.l - plain.text.l).toBeGreaterThan(130)
  expect(safe.text.r - plain.text.r).toBeGreaterThan(130)
})

test('without safe-area a default bigType keeps the old inset', async () => {
  const i = await inset('fx-bigtype')
  expect(i.text.l).toBeGreaterThan(30)
  expect(i.text.l).toBeLessThan(80)
})
