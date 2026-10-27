import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The fixture's one over-long label is its only problem.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and matrix text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-matrix`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['sections/10-a/20-long/scene.ts step 1: matrix: label of "x" too long'])
  })

// Step 5 moves "sso" from big bets (top right) to quick wins (top left): it is the accent one, the item placed
// before it has settled, and it ends in the top-left quadrant. The accent is the border and an outline around it (4 px).
test('the moved item is in the accent and lands in its new quadrant', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-matrix#/a/sort/5`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  const r = await page.evaluate(() => {
    const el = (id: string) => document.querySelector<HTMLElement>(`[data-k-matrix-item="${id}"]`)!
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--k-accent').trim()
    const probe = document.body.appendChild(document.createElement('div'))
    probe.style.color = accent
    const want = getComputedStyle(probe).color
    probe.remove()
    const [sso, exp] = [el('sso').getBoundingClientRect(), el('export').getBoundingClientRect()]
    const cs = (id: string) => getComputedStyle(el(id))
    return { sso: cs('sso').borderTopColor === want && cs('sso').outlineColor === want, export: cs('export').borderTopColor === want || cs('export').outlineColor === want, leftOfExport: sso.right < exp.left, sameRow: Math.abs(sso.top - exp.top) < 1 }
  })
  expect(r).toEqual({ sso: true, export: false, leftOfExport: true, sameRow: true })
  await page.close()
}, 60_000)

// The early scene builds the move to top left before the first place in top right: the slot pick happens when
// the step is added, so sso still fades in at top right on step 2 and moves to top left on step 3.
test('place adders built out of step order still place, then move', async () => {
  const at = async (step: number) => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-matrix#/a/early/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    const r = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('[data-scene="early"] [data-k-matrix-item="sso"]')!
      const r = el.getBoundingClientRect()
      return { shows: el.checkVisibility({ opacityProperty: true, visibilityProperty: true }), right: r.left > window.innerWidth / 2 }
    })
    await page.close()
    return r
  }
  expect(await at(2)).toEqual({ shows: true, right: true })
  expect(await at(3)).toEqual({ shows: true, right: false })
}, 60_000)

// place(id, { x, y }) centres the item at that share of the plot, y counted up from the x axis; a later place
// moves it, and quadrant slots still work beside it.
test('place(id, { x, y }) puts the item at its score in the plot', async () => {
  const at = async (step: number) => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-matrix#/a/scores/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    const r = await page.evaluate(() => {
      // The plot is where the axis lines run: the x title spans its width, the y title its height.
      const titles = [...document.querySelectorAll<HTMLElement>('[data-scene="scores"] div')].filter((e) => e.textContent === 'Effort' || e.textContent === 'Impact')
      const [x, y] = [titles.find((e) => e.textContent === 'Effort')!.getBoundingClientRect(), titles.find((e) => e.textContent === 'Impact')!.getBoundingClientRect()]
      const share = (id: string) => {
        const b = document.querySelector(`[data-scene="scores"] [data-k-matrix-item="${id}"]`)!.getBoundingClientRect()
        return { x: Math.round(((b.x + b.width / 2 - x.left) / x.width) * 100) / 100, y: Math.round(((y.bottom - (b.y + b.height / 2)) / y.height) * 100) / 100 }
      }
      return { sso: share('sso'), dark: share('dark') }
    })
    await page.close()
    return r
  }
  expect((await at(3))).toEqual({ sso: { x: 0.2, y: 0.9 }, dark: { x: 0.8, y: 0.1 } })
  expect((await at(4)).sso).toEqual({ x: 0.6, y: 0.5 })
}, 60_000)
