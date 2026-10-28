import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-formula&instant=1#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}
const terms = (page: Page) =>
  page.evaluate(() => [...document.querySelectorAll('div[data-scene="build"] .katex-html .k-ft')].map((t) => +getComputedStyle(t).opacity > 0.9))

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: a formula builds as it seeks at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-formula`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    // The TeX error comes while building, before any step.
    expect(r.problems).toEqual([
      expect.stringMatching(/^sections\/10-a\/20-broken\/scene\.ts: formula: KaTeX parse error: /),
      'sections/10-a/10-build/scene.ts step 5: formula: next() past the last \\step term (3 terms)',
      'sections/10-a/20-broken/scene.ts step 1: formula: does not fit 400 x 100 at 30px; split it or widen the rect',
    ])
  })

test('the formula is typeset, and its \\step terms show one per step in reading order', async () => {
  const page = await open('/a/build/1')
  expect(await page.evaluate(() => !!document.querySelector('div[data-scene="build"] .katex-display'))).toBe(true)
  expect(await terms(page)).toEqual([false, false, false])
  // The rest of the equation is there: E and the equals sign.
  expect(await page.evaluate(() => document.querySelector('div[data-scene="build"] .katex-html')!.textContent!.startsWith('E='))).toBe(true)
  for (const want of [[true, false, false], [true, true, false], [true, true, true]]) {
    await page.evaluate(() => window.klappe.stepper.next())
    await page.waitForTimeout(300)
    expect(await terms(page)).toEqual(want)
  }
  await page.close()
})

test('TeX that fails to parse shows as written in --k-warn', async () => {
  const page = await open('/a/broken/1')
  const r = await page.evaluate(() => {
    const box = document.querySelectorAll<HTMLElement>('div[data-scene="broken"] [data-k-formula]')[0]
    return { text: box.textContent, color: box.style.color, katex: !!box.querySelector('.katex') }
  })
  expect(r).toEqual({ text: '\\frac{1}{', color: 'var(--k-warn)', katex: false })
  await page.close()
})
