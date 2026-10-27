import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The walk's legibility check covers every level: text that shows is at least the floor and on stage.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek, every level legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-semanticzoom`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/20-wrong/scene.ts step 1: semanticZoom: "Billing" has nothing inside',
      'sections/10-a/20-wrong/scene.ts step 1: semanticZoom: into "Shop/API" from the top; go one level at a time',
      'sections/10-a/20-wrong/scene.ts step 1: semanticZoom: out at the top level',
    ])
  }, 120_000)

// Two levels in, the innermost labels read as large as the top level's did, and only that box's world shows.
test('into a box: its insides show at the top level size, the rest of its level is gone', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-semanticzoom#/a/dive/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll<HTMLElement>('[data-scene="dive"] [data-k-zoom-box]')].map((e) => {
          const t = e.firstElementChild!.getBoundingClientRect()
          return [e.dataset.kZoomBox, { on: e.checkVisibility({ opacityProperty: true, visibilityProperty: true }), h: t.height }]
        }),
      ),
    )
  }
  const top = await at(1)
  expect([top.Shop.on, top.Billing.on, top['Shop/API'].on]).toEqual([true, true, false])
  const deep = await at(3)
  expect([deep.Billing.on, deep['Shop/Web'].on, deep['Shop/API'].on, deep['Shop/API/Orders'].on]).toEqual([false, false, true, true])
  expect(deep['Shop/API/Orders'].h).toBeCloseTo(top.Billing.h, 0)
  const back = await at(5)
  expect([back.Shop.on, back.Billing.on, back['Shop/API/Orders'].on, back['Shop/Web'].on]).toEqual([true, true, false, false])
  await page.close()
}, 60_000)

// A level's links show with it and leave with it; each runs from the edge of one box to the edge of the other.
test('links show with their level, edge to edge, and go when the camera leaves it', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-semanticzoom#/a/links/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() => {
      const shows = (e: Element) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true })
      const box = (id: string) => document.querySelector(`[data-scene="links"] [data-k-zoom-box="${id}"]`)!.getBoundingClientRect()
      // Distance from a point to a box's outline, 0 on it.
      const off = (x: number, y: number, r: DOMRect) => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom))
      const links = [...document.querySelectorAll<SVGElement>('[data-scene="links"] [data-k-zoom-link]')].filter(shows)
      return links.map((l) => {
        const [from, to] = l.dataset.kZoomLink!.split(' > ')
        const p = l.querySelector('path')!
        const len = p.getTotalLength()
        const m = p.getScreenCTM()!
        const pt = (d: number) => new DOMPoint(p.getPointAtLength(d).x, p.getPointAtLength(d).y).matrixTransform(m)
        const [a, b] = [pt(0), pt(len)]
        const [fa, tb] = [box(from), box(to)]
        return { link: l.dataset.kZoomLink, touches: off(a.x, a.y, fa) < 12 && off(b.x, b.y, tb) < 30 }
      })
    })
  }
  const names = async (step: number) => (await at(step)).map((l) => l.link)
  expect(await names(1)).toEqual(['Shop > Billing', 'Billing > Support'])
  expect(await names(2)).toEqual(['Shop/Web > Shop/API', 'Shop/API > Shop/DB'])
  expect(await names(3)).toEqual(['Shop/API/Orders > Shop/API/Payments'])
  expect(await names(4)).toEqual(['Shop/Web > Shop/API', 'Shop/API > Shop/DB'])
  for (const step of [1, 2, 3]) for (const l of await at(step)) expect(l.touches, `${l.link} at step ${step}`).toBe(true)
  await page.close()
}, 60_000)
