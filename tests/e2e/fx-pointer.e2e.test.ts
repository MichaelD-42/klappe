import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-pointer`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['sections/10-a/20-no-size/scene.ts step 1: pointer: type field has no size to measure'])
  }, 120_000)

// The tip lands on the field's centre, the text is typed into it, then the tip moves on to the button point.
test('the pointer moves to its targets and types into the field', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-pointer#/a/walk/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() => {
      const tip = document.querySelector('[data-k-pointer] path')!.getBoundingClientRect()
      const field = document.querySelector('[data-scene="walk"] > div')!.getBoundingClientRect()
      const typed = document.querySelector<HTMLElement>('[data-scene="walk"] [data-k-text]')
      return { tip: { x: tip.left, y: tip.top }, field: { x: field.left + field.width / 2, y: field.top + field.height / 2 }, text: typed?.textContent, shown: typed ? getComputedStyle(typed).visibility : '' }
    })
  }
  const typed = await at(2)
  // The tip is the path's top left, give or take its stroke.
  expect(Math.abs(typed.tip.x - typed.field.x)).toBeLessThan(4)
  expect(Math.abs(typed.tip.y - typed.field.y)).toBeLessThan(4)
  expect([typed.text, typed.shown]).toEqual(['ada@example.com', 'visible'])
  const before = await at(1)
  expect(before.shown).toBe('hidden')
  await page.close()
}, 60_000)

// drag(card, to): the card's centre lands on the target, with the pointer tip on it; a second drag starts from there.
test('drag moves the element with the pointer to the target', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    const at = async (step: number) => {
      await page.goto(`${inject('BASE_URL')}/?fixture=fx-pointer#/a/drag/${step}`)
      await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
      await settle(page)
      return page.evaluate(() => {
        const [card, zone, tip] = [...document.querySelectorAll<HTMLElement>('[data-scene="drag"] > div')].filter((e) => !e.matches('[data-k-pointer]')).slice(0, 2)
          .concat(document.querySelector<HTMLElement>('[data-scene="drag"] [data-k-pointer]')!)
          .map((e) => e.getBoundingClientRect())
        const mid = (b: DOMRect) => ({ x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) })
        return { card: mid(card), zone: mid(zone), tip: { x: Math.round(tip.x), y: Math.round(tip.y) } }
      })
    }
    const one = await at(2)
    expect(one.card).toEqual(one.zone)
    expect(one.tip).toEqual(one.card)
    const two = await at(3)
    expect(two.card).toEqual({ x: 700, y: 300 })
    expect(two.tip).toEqual(two.card)
  } finally {
    await browser.close()
  }
}, 90_000)
