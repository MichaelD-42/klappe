import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

// The fixture's one out-of-frame label is its only problem and its only failed check.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and callouts stay in frame at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-callout`, vp)
    expect(r.errors).toEqual([])
    // The walk's own legibility check sees the same label outside the stage; that is the only failure.
    expect(r.checks.filter((c) => !c.ok).map((c) => c.name.replace(/\/\d+: /, ': '))).toEqual(['step #/a/far: legible'])
    expect(r.problems).toEqual(['callout: "Out of the frame" does not fit the frame on side left'])
  })

test('the leader ends at the code line edge and the label follows it', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-callout#/a/code/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index === 1, undefined, { timeout: 30_000 })
  await page.waitForTimeout(1500)
  const r = await page.evaluate(() => {
    const scene = document
    const label = scene.querySelector<HTMLElement>('div[data-k-callout]')!
    const line = document.querySelector('line[data-k-callout]')!.getBoundingClientRect()
    const lb = label.getBoundingClientRect()
    return { opacity: getComputedStyle(label.firstElementChild!).opacity, gap: lb.left - line.right, text: label.textContent }
  })
  expect(r.text).toBe('This line is the bug')
  expect(r.opacity).toBe('1')
  expect(Math.abs(r.gap)).toBeLessThan(2)
  await page.close()
})
