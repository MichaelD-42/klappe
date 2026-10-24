import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`world map walk passes at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-map`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBe(11)
    expect(r.ok).toBe(true)
  })

// The handle gives decks what they took from internal helpers: site positions, the arc path, a position for arc().
test('the worldMap handle exposes site points and arc paths, and arc() takes a position', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-map`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await page.evaluate(async () => {
    const imp = new Function('p', 'return import(p)') as (p: string) => Promise<any> // a string: vitest would rewrite import()
    const { worldMap, fitProjection, arcPath } = await imp('/src/fx/map.ts')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    document.querySelector('svg')!.append(svg)
    const problems: string[] = []
    const rect = { x: 100, y: 50, w: 1600, h: 900 }
    const ctx = { svg, html: document.body, rect: { x: 0, y: 0, w: 1920, h: 1080 }, camera: { to() {} }, problem: (p: string) => problems.push(p) }
    const sites = [{ id: 'a', label: 'A', lon: 13.4, lat: 52.5 }, { id: 'b', label: 'B', lon: -74, lat: 40.7 }]
    const map = worldMap(ctx, { rect, sites })
    const want = fitProjection(rect)([13.4, 52.5])
    const Timeline = window.klappe.canvases[0].tl.constructor // the page's own GSAP
    const tl = new Timeline({ paused: true })
    tl.to({}, { duration: 5 })
    map.arc(tl, 'a', 'b', 1.5)
    const out = {
      problems,
      point: map.point('a'),
      want,
      missing: map.point('nope'),
      arc: map.arcPath('a', 'b'),
      arcWant: arcPath(map.point('a'), map.point('b')),
      start: tl.recent().startTime(),
    }
    svg.remove()
    return out
  })
  expect(r.point).toEqual(r.want)
  expect(r.missing).toBeUndefined()
  expect(r.problems).toEqual(["worldMap: unknown site 'nope'"])
  expect(r.arc).toBe(r.arcWant)
  expect(r.start).toBe(1.5)
  await browser.close()
}, 30_000)

// A site without a label draws no text: a deck that sets its own labels needs no empty strings.
test('a site without a label draws no text, and zoomTo and world still work', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-map`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await page.evaluate(async () => {
    const imp = new Function('p', 'return import(p)') as (p: string) => Promise<any>
    const { worldMap } = await imp('/src/fx/map.ts')
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    document.querySelector('svg')!.append(svg)
    const problems: string[] = []
    const ctx = { svg, html: document.body, rect: { x: 0, y: 0, w: 1920, h: 1080 }, camera: { to() {} }, problem: (p: string) => problems.push(p) }
    const map = worldMap(ctx, { rect: { x: 0, y: 0, w: 1600, h: 900 }, sites: [{ id: 'a', lon: 13.4, lat: 52.5 }, { id: 'b', label: 'B', lon: -74, lat: 40.7 }] })
    const tl = new (window.klappe.canvases[0].tl.constructor as any)({ paused: true })
    map.zoomTo(tl, 'a')
    map.world(tl)
    tl.seek(tl.duration())
    const texts = [...svg.querySelectorAll('text')].map((t) => t.textContent)
    svg.remove()
    return { problems, texts }
  })
  expect(r).toEqual({ problems: [], texts: ['B'] })
  await browser.close()
})
