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
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-reveal`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

// Each unit of the first reveal: its text, its opacity (root times unit) and its top edge.
const read = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-k-reveal]')!
    return [...root.children].map((u) => ({
      text: u.textContent,
      o: Number(getComputedStyle(root).opacity) * Number(getComputedStyle(u).opacity),
      top: Math.round(u.getBoundingClientRect().top),
    }))
  })

test('the source lines rise in one after another, top line first, and settle in place', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-reveal#/a/before/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  await page.evaluate(() => void window.klappe.stepper.next())
  // The camera flies to the scene (1.6 s), then each line rises over 0.9 s, 0.3 s after the one above.
  await page.clock.runFor(1600 + 450)
  const mid = await read(page)
  await page.clock.runFor(2000)
  const end = await read(page)
  expect(mid.map((u) => u.text)).toEqual(['We ship small.', 'We ship often.', 'We ship together.'])
  expect(mid[0].o).toBeGreaterThan(mid[1].o)
  expect(mid[1].o).toBeGreaterThanOrEqual(mid[2].o)
  expect(mid[2].o).toBeLessThan(1)
  expect(mid[0].top).toBeGreaterThan(end[0].top) // still below its place: it rises
  expect(end.every((u) => u.o === 1)).toBe(true)
  expect(end[0].top).toBeLessThan(end[1].top)
  await page.close()
}, 60_000)

test('by word, each word is its own unit, in order', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-reveal#/a/text/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const words = await page.evaluate(() => [...document.querySelectorAll('[data-k-reveal]')[1].children].map((u) => u.textContent))
  expect(words.join(' ')).toBe('Every change goes through review before it ships.')
  expect(words).toHaveLength(8)
  await page.close()
})

// The word reveal holds 0.3 s (delay) before its first word rises, then rises 0.15 s apart.
test('delay holds the reveal before its first unit rises', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-reveal#/a/text/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  await page.evaluate(() => void window.klappe.stepper.next())
  const words = () => page.evaluate(() => [...document.querySelectorAll('[data-k-reveal]')[1].children].map((u) => Number(getComputedStyle(u).opacity)))
  await page.clock.runFor(250)
  expect((await words()).every((o) => o === 0)).toBe(true)
  await page.clock.runFor(200) // 0.45 s: the first word has risen for 0.15 s, the second only starts
  const [a, b, c] = await words()
  expect(a).toBeGreaterThan(0)
  expect(b).toBeLessThan(a)
  expect(c).toBe(0)
  await page.close()
})

// The key words of the stress scene: text, scale (from the transform matrix) and colour; and the accent's colour.
const keys = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const p = document.body.appendChild(document.createElement('div'))
    p.style.color = 'var(--k-accent)'
    const accent = getComputedStyle(p).color
    const root = document.querySelectorAll<HTMLElement>('[data-k-reveal]')[2]
    const ks = [...root.querySelectorAll<HTMLElement>('[data-k-key]')].map((k) => {
      const m = new DOMMatrix(getComputedStyle(k).transform)
      return { text: k.textContent, scale: Math.round(m.a * 100) / 100, accent: getComputedStyle(k).color === accent }
    })
    return { ks, plain: [...root.children].map((u) => u.textContent).join(' ') }
  })

test('**bold** words grow and take the accent as they rise; the markers never show', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-reveal#/a/text/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  await page.evaluate(() => void window.klappe.stepper.next())
  // The camera flies 1.6 s; "small" (word 3) starts to grow 0.6 s into the step, "very often" later.
  await page.clock.runFor(1600 + 400)
  const before = await keys(page)
  expect(before.plain).toBe('We ship small and very often.')
  expect(before.ks.map((k) => k.text)).toEqual(['small', 'very', 'often'])
  expect(before.ks.every((k) => k.scale === 1 && !k.accent)).toBe(true)
  await page.clock.runFor(3000)
  const end = await keys(page)
  expect(end.ks.every((k) => k.scale === 1.15 && k.accent)).toBe(true)
  await page.close()
}, 60_000)

test('a deep link to the stress step shows the key words grown and in the accent; reduced motion too', async () => {
  for (const q of ['', '&reducedmotion=1']) {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-reveal${q}#/a/stress/1`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    expect((await keys(page)).ks.every((k) => k.scale === 1.15 && k.accent)).toBe(true)
    await page.close()
  }
}, 60_000)

test('with reduced motion the whole text fades in, every line already in place', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-reveal&reducedmotion=1#/a/text/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const units = await page.evaluate(() =>
    [...document.querySelector('[data-k-reveal]')!.children].map((u) => getComputedStyle(u).transform),
  )
  expect(units.every((t) => t === 'none')).toBe(true)
  expect((await read(page)).every((u) => u.o === 1)).toBe(true)
  await page.close()
})
