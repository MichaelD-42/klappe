import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-wordcloud`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

// Each word: its text, opacity, transform and the box of its glyphs (not of its estimated span).
const read = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-k-word]')].map((w) => {
      const range = document.createRange()
      range.selectNodeContents(w)
      const b = range.getBoundingClientRect()
      return { text: w.textContent!, o: Number(getComputedStyle(w).opacity), t: getComputedStyle(w).transform, color: getComputedStyle(w).color, b: { l: b.left, t: b.top, r: b.right, b: b.bottom } }
    }),
  )
const open = async (url: string, w = 1920, h = 1080) => {
  const page = await browser.newPage({ viewport: { width: w, height: h } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-wordcloud${url}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

test('step 1 shows the three heaviest words, step 2 the rest; the heaviest is in the accent colour', async () => {
  const page = await open('#/a/cloud/1')
  const one = await read(page)
  expect(one.slice(0, 3).map((w) => w.text)).toEqual(['Ownership', 'Trust', 'Feedback'])
  expect(one.filter((w) => w.o === 1).map((w) => w.text)).toEqual(['Ownership', 'Trust', 'Feedback'])
  const accent = await page.evaluate(() => {
    const p = document.body.appendChild(document.createElement('div'))
    p.style.color = 'var(--k-accent)'
    return getComputedStyle(p).color
  })
  expect(one[0].color).toBe(accent)
  expect(one[1].color).not.toBe(accent)
  await page.evaluate(() => void window.klappe.stepper.goto(window.klappe.stepper.index + 1, 'cut'))
  const two = await read(page)
  expect(two).toHaveLength(19)
  expect(two.every((w) => w.o === 1 && (w.t === 'none' || w.t === 'matrix(1, 0, 0, 1, 0, 0)'))).toBe(true)
  await page.close()
}, 60_000)

test('no two words overlap on screen, wide letters included, and the layout is the same on every load and size', async () => {
  const boxes = async (w: number, h: number) => {
    const page = await open('#/a/cloud/2', w, h)
    const words = await read(page)
    const html = await page.evaluate(() => {
      const r = document.querySelector('[data-k-cloud]')!.parentElement!.getBoundingClientRect()
      return { left: r.left, width: r.width }
    })
    await page.close()
    return { words, s: html.width / 1920, left: html.left }
  }
  const a = await boxes(1920, 1080)
  const hits = a.words.flatMap((p, i) =>
    a.words.slice(i + 1).filter((q) => p.b.l < q.b.r && q.b.l < p.b.r && p.b.t < q.b.b && q.b.t < p.b.b).map((q) => [p.text, q.text]),
  )
  expect(hits).toEqual([])
  const again = await boxes(1920, 1080)
  expect(again.words.map((w) => w.b)).toEqual(a.words.map((w) => w.b))
  // At 1366 the same layout, scaled: each word's left edge in scene units within a pixel.
  const small = await boxes(1366, 768)
  const lefts = (x: typeof a) => x.words.map((w) => (w.b.l - x.left) / x.s)
  lefts(small).forEach((l, i) => expect(Math.abs(l - lefts(a)[i])).toBeLessThan(3))
}, 90_000)

test('no two words overlap in the bold theme either: its font is taller and wider', async () => {
  const page = await open('&theme=bold#/a/cloud/2')
  const w = await read(page)
  await page.close()
  expect(w.flatMap((p, i) => w.slice(i + 1).filter((q) => p.b.l < q.b.r && q.b.l < p.b.r && p.b.t < q.b.b && q.b.t < p.b.b).map((q) => [p.text, q.text]))).toEqual([])
}, 60_000)

test('words grow in, heaviest first, mid-play', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-wordcloud#/a/cloud/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(300)
  const mid = await read(page)
  expect(mid[3].o).toBeGreaterThan(0)
  expect(mid[3].o).toBeGreaterThan(mid[18].o)
  expect(mid[18].o).toBeLessThan(1)
  await page.clock.runFor(3000)
  expect((await read(page)).every((w) => w.o === 1)).toBe(true)
  await page.close()
}, 60_000)

test('with reduced motion the words fade in at full size', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-wordcloud&reducedmotion=1#/a/cloud/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(200)
  const mid = await read(page)
  expect(mid[5].o).toBeGreaterThan(0)
  expect(mid[5].o).toBeLessThan(1)
  expect(mid.every((w) => w.t === 'none' || w.t === 'matrix(1, 0, 0, 1, 0, 0)')).toBe(true)
  await page.close()
}, 60_000)
