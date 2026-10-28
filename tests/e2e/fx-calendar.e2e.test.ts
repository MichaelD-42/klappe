import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-calendar&instant=1#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: the calendar plays as it seeks at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-calendar`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/20-bad/scene.ts step 2: calendar: 2026-12-24 is not in 2026-11',
      'sections/10-a/20-bad/scene.ts step 3: calendar: span from 2026-11-20 ends before it starts (2026-11-10)',
    ])
  })

test('a mark lights its day; a span lays one bar per week over its days', async () => {
  const page = await open('/a/month/4')
  const r = await page.evaluate(() => {
    const root = document.querySelector('div[data-scene="month"]')!
    const box = (e: Element) => e.getBoundingClientRect()
    const day = (d: string) => box(root.querySelector(`[data-k-day="${d}"]`)!)
    const shows = (e: Element) => +getComputedStyle(e).opacity > 0.9 && getComputedStyle(e).visibility !== 'hidden'
    const marks = [...root.querySelectorAll<HTMLElement>('[data-k-mark]')].filter(shows).map((m) => ({ date: m.dataset.kMark, on: Math.abs(box(m).x - day(m.dataset.kMark!).x) < 2 && Math.abs(box(m).y - day(m.dataset.kMark!).y) < 2 }))
    const bars = [...root.querySelectorAll('[data-k-span]')].filter(shows).map(box)
    const inside = (b: DOMRect, a: string, z: string) => b.left >= day(a).left && b.right <= day(z).right && b.top >= day(a).top && b.bottom <= day(a).bottom
    return { marks, bars: bars.length, fits: [inside(bars[0], '2026-11-05', '2026-11-08'), inside(bars[1], '2026-11-09', '2026-11-15'), inside(bars[2], '2026-11-16', '2026-11-17')], label: root.querySelector('[data-k-span]')!.textContent }
  })
  expect(r.marks).toEqual([{ date: '2026-11-03', on: true }, { date: '2026-11-27', on: true }])
  expect(r.bars).toBe(3)
  expect(r.fits).toEqual([true, true, true])
  expect(r.label).toBe('Sprint 12')
  await page.close()
}, 60_000)
