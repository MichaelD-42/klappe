import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The Likert scale with four names and the row with three counts are the fixture's problems.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek and gauge, Likert and bar steps are legible at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-gauge${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['likert: scale needs 5 point names, got 4', 'likert: row 3 needs 5 counts of 0 or more, got [1, 2, 3]'])
  }, 120_000)

async function open(hash: string, q = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-gauge${q}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

// The gauge's number and its needle's angle from straight up, to a tenth of a degree; arc is the arc's dash offset.
const dial = (page: Page, arc = false) =>
  page.evaluate((arc) => {
    const g = document.querySelector('div[data-scene="dial"] [data-k-gauge]')!
    const m = (g.querySelector('line') as SVGLineElement).transform.baseVal.consolidate()!.matrix
    const r = { text: g.querySelector('[data-k-text]')!.textContent, angle: Math.round((Math.atan2(m.b, m.a) * 1800) / Math.PI) / 10 }
    return { ...r, arc: arc ? getComputedStyle(g.querySelectorAll('path')[1]).strokeDashoffset : undefined } // toEqual skips an undefined arc
  }, arc)

test('the needle swings to the value, then on to each new value in step order, numbers in German', async () => {
  for (const [step, want] of [
    [1, { text: '72,5', angle: 40.5 }],
    [2, { text: '95,5', angle: 81.9 }],
    [3, { text: '40', angle: -18 }],
  ] as const) {
    const page = await open(`#/a/dial/${step}`)
    expect(await dial(page)).toEqual(want)
    await page.close()
  }
}, 60_000)

test('a step back over a swing to a whole number shows the decimals again', async () => {
  const page = await open('#/a/dial/2')
  const want = await dial(page, true) // the arc rewinds too: its offset is a fraction, not rounded to 0
  expect(want.arc).not.toBe('0px')
  await page.keyboard.press('ArrowRight')
  await settle(page)
  await page.keyboard.press('ArrowLeft')
  await settle(page)
  expect(await dial(page, true)).toEqual({ ...want, text: '95,5', angle: 81.9 })
  await page.close()
}, 60_000)

test('with reduced motion the needle still ends on the value', async () => {
  const page = await open('#/a/dial/2', '&reducedmotion=1')
  expect(await dial(page)).toEqual({ text: '95,5', angle: 81.9 })
  await page.close()
}, 60_000)

test('each Likert step fills one row and shows its agree share', async () => {
  const page = await open('#/a/survey/2')
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('div[data-scene="survey"] [data-k-likert-row]')].map((r) => {
      const bar = r.children[1].firstElementChild!
      const num = r.lastElementChild!
      return { width: Math.round(bar.getBoundingClientRect().width), share: getComputedStyle(num).visibility === 'visible' ? num.textContent : null }
    }),
  )
  expect(rows[0].width).toBeGreaterThan(500)
  expect(rows[0].share).toBe('70 %')
  expect(rows.slice(1).map((r) => r.width)).toEqual([0, 0])
  expect(rows.slice(1).map((r) => r.share)).toEqual([null, null])
  await page.close()
}, 60_000)

test('a bar chart shows one more bar and its value per step', async () => {
  for (const [step, n] of [
    [1, 0],
    [2, 1],
    [3, 2],
  ] as const) {
    const page = await open(`#/a/bars/${step}`)
    const r = await page.evaluate(() => {
      const g = document.querySelector('[data-k-chart="bar"]')!
      const grown = [...g.querySelectorAll('rect')].filter((b) => b.getBoundingClientRect().height > 1).length
      const shown = [...g.querySelectorAll<SVGTextElement>('text[data-k-text]')].filter((t) => getComputedStyle(t).visibility === 'visible').map((t) => t.textContent)
      return { grown, shown }
    })
    expect(r.grown).toBe(n)
    expect(r.shown).toEqual(['120', '185'].slice(0, n))
    await page.close()
  }
}, 60_000)
