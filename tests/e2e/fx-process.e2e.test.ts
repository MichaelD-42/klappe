import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-process&instant=1#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}
const state = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('g[data-scene="walk"] [data-k-stage]')].map((g, i) => {
      const hot = getComputedStyle(g.children[1]).opacity
      const label = document.querySelectorAll<HTMLElement>('div[data-scene="walk"] [style*="nowrap"]')[i]
      return { lit: +hot > 0.9, muted: label.style.color === 'var(--k-muted)' }
    }),
  )

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: process steps play as they seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-process`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/20-tight/scene.ts step 1: processSteps: "A stage name far too long for its chevron" does not fit its chevron at 20px; shorten it or widen the rect',
      'sections/10-a/20-tight/scene.ts step 2: processSteps: no stage 9; the stages are 0 to 2',
    ])
  })

test('one stage is lit at a time, in step order; the stages before it are muted', async () => {
  const page = await open('/a/walk/1')
  const lit = async () => (await state(page)).map((s) => s.lit)
  const muted = async () => (await state(page)).map((s) => s.muted)
  expect(await lit()).toEqual([true, false, false, false, false])
  expect(await muted()).toEqual([false, false, false, false, false])
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(300)
  expect(await lit()).toEqual([false, true, false, false, false])
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(300)
  expect(await lit()).toEqual([false, false, false, true, false])
  expect(await muted()).toEqual([true, true, true, false, false])
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(300)
  expect(await lit()).toEqual([true, false, false, false, false])
  expect(await muted()).toEqual([false, false, false, false, false])
  await page.close()
})

test('the chevrons fill the rect and interlock: each point sits in the next one\'s notch', async () => {
  const page = await open('/a/walk/1')
  const pts = await page.evaluate(() =>
    [...document.querySelectorAll('g[data-scene="walk"] [data-k-stage] polygon:first-child')].map((p) => p.getAttribute('points')!.split(' ').map((q) => q.split(',').map(Number))),
  )
  expect(pts.length).toBe(5)
  expect(pts[0][0][0]).toBe(160) // the first starts at the rect's left
  expect(Math.round(pts[4][2][0])).toBe(1760) // the last point ends at its right
  for (let i = 1; i < 5; i++) expect(pts[i][5][0] - pts[i][0][0]).toBeCloseTo(pts[i - 1][2][0] - pts[i - 1][1][0]) // notch as deep as the point
  await page.close()
})
