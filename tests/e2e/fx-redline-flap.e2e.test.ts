import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const [vp, flags] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${flags}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-redline-flap${flags}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 180_000)

async function open(hash: string, flags = '', clock = false): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  if (clock) await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-redline-flap${flags}#/a/${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

// Per word: its kind, its box width, its opacity, and the width of its strike or underline.
const words = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-k-redline] > span')].map((w) => {
      const t = w.firstElementChild as HTMLElement
      const bars = [...t.querySelectorAll('span')].map((b) => b.getBoundingClientRect().width)
      return {
        op: ['keep', 'del', 'add'].find((k) => w.hasAttribute(`data-k-redline-${k}`))!,
        text: t.textContent,
        w: w.getBoundingClientRect().width,
        o: Number(getComputedStyle(w).opacity),
        bar: bars[bars.length - 1] ?? 0, // the strike, or the underline
        tw: t.getBoundingClientRect().width,
      }
    }),
  )
const shown = (ws: Awaited<ReturnType<typeof words>>) => ws.filter((w) => w.w > 1 && w.o > 0).map((w) => w.text).join(' ')

test('apply strikes the deleted words and fades the new ones in at full width; clean leaves the after text', async () => {
  const page = await open('prose/1', '', true)
  await page.clock.runFor(500)
  expect(shown(await words(page))).toBe('We release every month after a manual test run.')
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(450) // half of the 0.9 s apply
  const mid = await words(page)
  const month = mid.find((w) => w.text === 'month')!
  const week = mid.find((w) => w.text === 'week')!
  expect(month.bar).toBeGreaterThan(0)
  expect(month.bar).toBeLessThan(month.tw)
  expect(week.o).toBeGreaterThan(0)
  expect(week.o).toBeLessThan(1)
  await page.clock.runFor(1000)
  const end = await words(page)
  expect(Math.abs(end.find((w) => w.text === 'week')!.w - week.w)).toBeLessThan(0.5) // the new word holds its full width from the step start
  for (const w of end.filter((w) => w.op !== 'keep')) {
    expect(w.bar).toBeGreaterThan(w.tw * 0.95) // the mark runs the whole word
    expect(w.w).toBeGreaterThan(w.tw) // the word and its space, not clipped
  }
  expect(end.filter((w) => w.op === 'del').every((w) => w.o > 0.55 && w.o < 0.65)).toBe(true)
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(1500)
  const clean = await words(page)
  expect(shown(clean)).toBe('We release every week after an automated test run.')
  expect(clean.filter((w) => w.op === 'del').every((w) => w.w < 1)).toBe(true)
  await page.close()
}, 60_000)

const board = (page: Page, n = 0) =>
  page.evaluate((n) => [...document.querySelectorAll('[data-k-splitflap]')[n].querySelectorAll('[data-k-text]')].map((c) => c.textContent).join(''), n)

test('the board flips through other characters to the new word, left cells first', async () => {
  const page = await open('board/1', '', true)
  await page.clock.runFor(500)
  expect(await board(page)).toBe('BOARDING')
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(900) // half of the 1.8 s flip
  const mid = await board(page)
  expect(mid).not.toBe('BOARDING')
  expect(mid).not.toBe('DELAYED ')
  await page.clock.runFor(1200)
  expect(await board(page)).toBe('DELAYED ')
  await page.close()
}, 60_000)

test('a deep link lands on each step text; adders built out of step order flip in step order', async () => {
  // Board n: 0 is the board scene's, 1 the early scene's (all scenes of a section share one canvas).
  for (const [hash, n, want] of [['board/3', 0, 'GATE 12 '], ['early/2', 1, '1999'], ['early/3', 1, '2026'], ['early/1', 1, '0   ']] as const) {
    const page = await open(hash)
    expect(await board(page, n)).toBe(want)
    await page.close()
  }
}, 60_000)

test('with reduced motion the board cuts to the new text: no other character shows', async () => {
  const page = await open('board/1', '&reducedmotion=1', true)
  await page.clock.runFor(500)
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(50)
  expect(await board(page)).toBe('DELAYED ')
  await page.close()
}, 60_000)

test('a cell holds the widest glyphs of every theme font', async () => {
  for (const theme of ['calm', 'bold']) {
    const page = await open('board/1', `&theme=${theme}`)
    const over = await page.evaluate(() =>
      ['W', 'M', '€', '%'].flatMap((c) => {
        const g = document.querySelector<HTMLElement>('[data-k-splitflap] [data-k-text]')!
        g.textContent = c
        const [gw, cw] = [g.getBoundingClientRect().width, g.parentElement!.clientWidth]
        return gw > cw ? [`${c}: ${gw} of ${cw}`] : []
      }),
    )
    expect(over, theme).toEqual([])
    await page.close()
  }
}, 60_000)
