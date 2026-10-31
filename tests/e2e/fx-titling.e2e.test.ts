import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string, reduced = false, fixture = 'fx-titling'): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, reducedMotion: reduced ? 'reduce' : 'no-preference' })
  await page.goto(`${inject('BASE_URL')}/?fixture=${fixture}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-titling`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

test('the end roll lists each recorded source once, in deck order, and leaves out the placeholder', async () => {
  const page = await open('#/a/roll/1')
  const rows = await page.evaluate(() => [...document.querySelectorAll('div[data-scene="roll"] [data-k-source]')].map((e) => e.textContent))
  expect(rows).toEqual(['Statistik A', 'Statistik B', 'Survey C', 'Race R', 'Words W'])
  await page.close()
})

test('the lower third sits in the safe area, slides in on show and out on hide', async () => {
  const page = await open('#/a/name/1')
  const box = () => page.evaluate(() => {
    const r = document.querySelector('div[data-scene="name"] [data-k-lowerthird]')!.getBoundingClientRect()
    return { l: r.left, b: r.bottom, a: +getComputedStyle(document.querySelector('div[data-scene="name"] [data-k-lowerthird]')!).opacity }
  })
  const shown = await box()
  expect(shown.a).toBe(1)
  expect(shown.l).toBeGreaterThanOrEqual(63)
  expect(shown.b).toBeLessThanOrEqual(1080 - 47)
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.stepper.index + 1, 'cut'))
  await settle(page)
  expect((await box()).l).toBeLessThan(0)
  await page.close()
})

test('after the roll has scrolled the credits are off the frame', async () => {
  const page = await open('#/a/roll/1')
  expect(await page.evaluate(() => document.querySelector('div[data-scene="roll"] [data-k-endroll-inner]')!.getBoundingClientRect().top)).toBeLessThan(0)
  await page.close()
})

test('a seek into the roll gives the credits the position the tween has at that time, forward or back', async () => {
  const page = await open('#/a/roll/1')
  const r = await page.evaluate(() => {
    const inner = document.querySelector<HTMLElement>('div[data-scene="roll"] [data-k-endroll-inner]')!
    const tl = (window.klappe as any).canvases[0].tl
    const roll = tl.getChildren(true, true, false).find((t: any) => t.targets?.().includes(inner))
    const mid = roll.startTime() + roll.duration() / 2
    const y = () => new DOMMatrix(getComputedStyle(inner).transform).m42
    const h = inner.offsetHeight
    tl.time(mid)
    const first = y()
    tl.time(0)
    const hidden = y()
    tl.time(roll.startTime() + roll.duration() * 0.9)
    tl.time(mid)
    return { first, again: y(), hidden, expected: (984 - h) / 2 }
  })
  expect(r.again).toBeCloseTo(r.first, 3)
  expect(r.first).toBeCloseTo(r.expected, 1) // half way between the start pose (the rect's height) and the end (minus the content's)
  expect(r.hidden).toBeGreaterThanOrEqual(984 - 1)
  await page.close()
})

test('with reduced motion a long list shows whole inside the rect', async () => {
  const page = await open('#/a/roll/1', true, 'fx-titling-long')
  const r = await page.evaluate(() => {
    const box = document.querySelector('div[data-scene="roll"] [data-k-endroll]')!.getBoundingClientRect()
    const rows = [...document.querySelectorAll('div[data-scene="roll"] [data-k-source]')].map((e) => e.getBoundingClientRect())
    return { n: rows.length, inside: rows.every((b) => b.top >= box.top - 1 && b.bottom <= box.bottom + 1 && b.left >= box.left - 1 && b.right <= box.right + 1) }
  })
  expect(r).toEqual({ n: 40, inside: true })
  await page.close()
})
