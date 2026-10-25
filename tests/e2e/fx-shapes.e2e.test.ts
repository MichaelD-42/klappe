import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// Reduced motion too: shapes draw on as lineArt does (a stroke reveal, no movement).
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-shapes${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.steps).toBe(5)
  }, 120_000)

async function open(): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-shapes`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

// After a cut to step i: each shape group's visibility and stroke, and the word's colour, with the tokens they should be.
const state = (page: Page, i: number) =>
  page.evaluate(async (i) => {
    await window.klappe.stepper.goto(i, 'cut')
    const rgb = (token: string) => {
      const probe = document.body.appendChild(document.createElement('i'))
      probe.style.color = `var(${token})`
      const c = getComputedStyle(probe).color
      probe.remove()
      return c
    }
    const groups = [...document.querySelectorAll('g[data-k-shape]')].map((g) => {
      const st = getComputedStyle(g)
      return { visible: st.visibility === 'visible', stroke: st.stroke, width: parseFloat(st.strokeWidth) }
    })
    const word = document.querySelector('[data-word]')!
    return { groups, word: getComputedStyle(word).color, line: rgb('--k-line'), accent: rgb('--k-accent'), warn: rgb('--k-warn'), fg: rgb('--k-fg') }
  }, i)

test('shapes are hidden until their step, in --k-line or --k-accent at 4 px; tints land on their tokens, in order', async () => {
  const page = await open()
  let s = await state(page, 0)
  // Order: rect, circle, line, arrow. Only the rect has drawn.
  expect(s.groups.map((g) => g.visible)).toEqual([true, false, false, false])
  expect(s.groups.map((g) => g.stroke)).toEqual([s.line, s.line, s.line, s.accent])
  expect(s.groups.every((g) => g.width >= 2)).toBe(true)
  expect(s.word).toBe(s.fg)
  s = await state(page, 2)
  expect(s.groups.every((g) => g.visible)).toBe(true)
  s = await state(page, 3)
  expect(s.word).toBe(s.accent)
  s = await state(page, 4)
  expect(s.word).toBe(s.warn)
  s = await state(page, 3) // back: the second tint is undone
  expect(s.word).toBe(s.accent)
  await page.close()
}, 60_000)

test('mid-draw the arrow shaft is part drawn and its head not yet shown', async () => {
  const page = await open()
  await page.evaluate(() => window.klappe.stepper.goto(1, 'cut'))
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(400)
  const r = await page.evaluate(() => {
    const [shaft, head] = [...document.querySelectorAll('g[data-k-shape]')][3].querySelectorAll('path')
    return { shaft: parseFloat(getComputedStyle(shaft).strokeDashoffset), head: getComputedStyle(head).visibility }
  })
  expect(r.shaft).toBeGreaterThan(0.05)
  expect(r.shaft).toBeLessThan(1.25)
  expect(r.head).toBe('hidden')
  await page.close()
}, 60_000)
