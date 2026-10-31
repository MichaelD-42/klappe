import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// A 1x1 file is enough: the clip path, not the picture, is under test.
async function open(hash: string, theme = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.route('https://klappe.test/**', (r) => r.fulfill({ body: Buffer.alloc(0), contentType: 'video/webm' }))
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-bigtype${theme}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-bigtype`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems.length).toBe(1)
    expect(r.problems[0]).toContain('IMAGE MISSING')
    expect(r.problems[0]).toContain('A harbour at dawn')
  }, 120_000)

// The bold theme's heading face is a wide one that ships with klappe, so the fit does not rest on Inter's width.
test('a word fills the safe-area width in the heading font; a number fills its own rect', async () => {
  const page = await open('#/a/word/1', '&theme=bold')
  const width = (scene: string) =>
    page.evaluate((s) => {
      const el = document.querySelector<HTMLElement>(`div[data-scene="${s}"] div[style*="font-weight: 800"]`)!
      const r = document.createRange()
      r.selectNodeContents(el)
      return { w: r.getBoundingClientRect().width, family: getComputedStyle(el).fontFamily, color: getComputedStyle(el).color }
    }, scene)
  const word = await width('word')
  expect(word.w).toBeGreaterThan(1792 * 0.97)
  expect(word.w).toBeLessThan(1792 * 1.03)
  expect(word.family).toContain('Space Grotesk')
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.stepper.index + 2, 'cut'))
  await settle(page)
  const num = await width('number')
  expect(num.w).toBeGreaterThan(1000 * 0.95)
  expect(num.w).toBeLessThan(1000 * 1.03)
  await page.close()
})

test('media is clipped to the letters by an SVG clip path; the clip text fills the width', async () => {
  const page = await open('#/a/image/1')
  const r = await page.evaluate(() => {
    const box = document.querySelector<HTMLElement>('div[data-scene="image"] [role="img"]')!
    const id = /url\("?#(.+?)"?\)/.exec(getComputedStyle(box).clipPath)![1]
    const text = document.querySelector<SVGTextElement>(`#${id} text`)!
    return { text: text.textContent, w: text.getBBox().width, img: !!box.querySelector('img'), label: box.getAttribute('aria-label') }
  })
  expect(r.text).toBe('Shipping')
  expect(r.w).toBeGreaterThan(1792 * 0.95)
  expect(r.w).toBeLessThan(1792 * 1.03)
  expect(r.img).toBe(true)
  expect(r.label).toBe('A red dot on blue')
  await page.close()
})

test('a video shows through the letters, loops on the wall clock and holds still in the self-test', async () => {
  const page = await open('#/a/video/1')
  const r = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>('div[data-scene="video"] [role="img"] video')!
    return { loop: v.loop, muted: v.muted, ignore: v.hasAttribute('data-k-ignore'), clip: getComputedStyle(v.parentElement!).clipPath }
  })
  expect(r).toMatchObject({ loop: true, muted: true, ignore: true })
  expect(r.clip).toContain('url(')
  await page.close()
})

test('a missing picture shows IMAGE MISSING and records a deck problem', async () => {
  const page = await open('#/a/missing/1')
  expect(await page.evaluate(() => document.querySelector('div[data-scene="missing"]')?.textContent)).toContain('IMAGE MISSING')
  expect((await page.evaluate(() => window.klappe.problems as string[])).some((p) => p.includes('A harbour at dawn'))).toBe(true)
  await page.close()
})
