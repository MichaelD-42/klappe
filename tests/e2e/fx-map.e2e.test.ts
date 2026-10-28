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
    expect(r.steps).toBe(13)
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

// A site without a label draws no text: a deck that sets its own labels needs no empty strings. A region the
// atlas lacks is a problem.
test('a site without a label draws no text, zoomTo and world still work, an unknown region is a problem', async () => {
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
    const before = problems.length
    map.region(tl, 'Atlantis') // not a country the atlas has
    svg.remove()
    return { problems, texts, before }
  })
  expect(r).toEqual({ problems: ["worldMap: no country 'Atlantis'; use the ISO 3166-1 numeric code or the name in world-atlas"], texts: ['B'], before: 0 })
  await browser.close()
})

// region() fills a country in --k-accent at MARKER_MIX, under the coastline, by name or ISO numeric code.
test('region fills a country by name or by ISO numeric code', async () => {
  const { chromium } = await import('@playwright/test')
  const { settle } = await import('./driver')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-map#/a/regions/2`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    const r = await page.evaluate(() =>
      [...document.querySelectorAll<SVGPathElement>('[data-scene="regions"] [data-k-region]')].map((p) => {
        const b = p.getBoundingClientRect()
        return { id: p.dataset.kRegion, shows: p.checkVisibility({ opacityProperty: true, visibilityProperty: true }), fill: p.style.fill, big: b.width > 20 && b.height > 20, x: b.x }
      }),
    )
    const [de, us] = ['Germany', '840'].map((id) => r.find((p) => p.id === id)!)
    for (const p of [de, us]) expect(p).toMatchObject({ shows: true, fill: 'color-mix(in srgb, var(--k-accent) 35%, transparent)', big: true })
    expect(r).toHaveLength(2)
    // The USA lies west of Germany.
    expect(us.x).toBeLessThan(de.x)
  } finally {
    await browser.close()
  }
}, 60_000)

// A major site's label reads at world zoom: it shows with its site, hides while the camera zooms in, and comes back.
test('a major site shows a large label at world zoom, hidden while zoomed', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-map#/a/world/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await page.waitForTimeout(2500)
    return page.evaluate(() => {
      const t = document.querySelector<SVGTextElement>('[data-scene="world"] text[data-k-map-major]')
      return t && { shown: getComputedStyle(t).visibility !== 'hidden' && Number(getComputedStyle(t).opacity) > 0.9, px: t.getBoundingClientRect().height }
    })
  }
  const world = await at(2)
  expect(world?.shown).toBe(true)
  expect(world!.px).toBeGreaterThanOrEqual(14.2)
  expect((await at(4))?.shown).toBe(false)
  expect((await at(5))?.shown).toBe(true)
  await browser.close()
}, 90_000)
