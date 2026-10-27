import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The walk plays each step, deep-links to it and steps back from the next one, and compares.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-handwrite`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

// For the first phrase: how many glyphs are whole, hidden or part-written, and its font.
const read = (page: import('@playwright/test').Page) =>
  page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-k-handwrite]')!
    const clips = [...root.children].map((s) => (s as HTMLElement).style.clipPath)
    return {
      whole: clips.filter((c) => c === 'none').length,
      hidden: clips.filter((c) => c === 'inset(0px 100% 0px 0px)' || c === 'inset(0 100% 0 0)').length,
      opacity: getComputedStyle(root).opacity,
      font: [...document.fonts].some((f) => f.family.includes('Caveat') && f.status === 'loaded'),
      n: clips.length,
    }
  })

test('mid-write some glyphs are whole and some hidden; at the end all are whole, in Caveat', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-handwrite#/a/before/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  await page.evaluate(() => void window.klappe.stepper.next())
  // The camera flies to the scene (1.6 s), then the 17 characters write over 1.53 s.
  await page.clock.runFor(1600 + 750)
  const mid = await read(page)
  await page.clock.runFor(2000)
  const end = await read(page)
  expect(mid.whole).toBeGreaterThan(0)
  expect(mid.hidden).toBeGreaterThan(0)
  expect(end).toEqual({ whole: 17, hidden: 0, opacity: '1', font: true, n: 17 })
  await page.close()
}, 60_000)

test('with reduced motion the phrase fades in whole', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-handwrite&reducedmotion=1#/a/notes/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await read(page)
  expect(r.whole).toBe(17)
  await page.close()
})

// Several lines: a list item's source lines (trimmed) or a list, each on its own line, all written by the end.
test('a text of several lines writes each on its own line', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-handwrite#/a/lines/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  const r = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-scene="lines"] [data-k-handwrite]')].map((e) => ({
      lines: e.innerText.split('\n'),
      whole: [...e.children].every((s) => (s as HTMLElement).style.clipPath === 'none'),
      label: e.getAttribute('aria-label'),
    })),
  )
  expect(r).toEqual([
    { lines: ['Ship it', 'on Friday'], whole: true, label: 'Ship it on Friday' },
    { lines: ['Then tell', 'the team'], whole: true, label: 'Then tell the team' },
  ])
  await page.close()
}, 60_000)
