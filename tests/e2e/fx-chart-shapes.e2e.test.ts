import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-chart-shapes&instant=1#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: radar, heatmap and treemap play as they seek and stay legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-chart-shapes`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBe(22)
  })

test('a radar: one shape per series with a corner per dimension, the first at 12 o\'clock; names outside the shapes', async () => {
  const page = await open('/a/radar/3')
  const r = await page.evaluate(() => {
    const g = document.querySelector('g[data-scene="radar"] [data-k-chart="radar"]')!
    const shapes = [...g.querySelectorAll('path')].filter((p) => p.getAttribute('d')!.endsWith('Z') && p.style.fillOpacity === '0.25')
    const corners = shapes.map((p) => p.getAttribute('d')!.slice(1, -1).split('L').map((q) => q.split(' ').map(Number)))
    const box = (e: Element) => e.getBoundingClientRect()
    const hull = shapes.map(box)
    const names = [...g.querySelectorAll('text')].filter((t) => ['Speed', 'Quality', 'Scope', 'Cost', 'Risk'].includes(t.textContent!)).map(box)
    const inside = (n: DOMRect, s: DOMRect) => n.left >= s.left && n.right <= s.right && n.top >= s.top && n.bottom <= s.bottom
    return { n: shapes.length, corners: corners.map((c) => c.length), first: corners[0][0], centreX: (hull[0].left + hull[0].right) / 2, names: names.length, nameInShape: names.some((n) => hull.some((s) => inside(n, s))) }
  })
  expect(r.n).toBe(2)
  expect(r.corners).toEqual([5, 5])
  expect(r.names).toBe(5)
  expect(r.nameInShape).toBe(false)
  await page.close()
})

test('a heatmap shades a higher value nearer the accent, and cell() moves one outline, back too', async () => {
  const page = await open('/a/heat/4')
  const pct = (v: string) => Number(/(\d+)%/.exec(v)![1])
  const cells = await page.evaluate(() => [...document.querySelectorAll<SVGRectElement>('g[data-scene="heat"] [data-k-chart] rect')].filter((c) => c.style.fill.includes('color-mix') && c.getAttribute('rx') === '4').map((c) => c.style.fill))
  expect(cells.length).toBe(25) // five days by five hours; the ramp's swatches have rx 3
  // Thu 12h (14) is the highest value, Wed 8h (1) the lowest.
  const at = (row: number, col: number) => cells[row * 5 + col]
  expect(pct(at(3, 2))).toBe(100)
  expect(pct(at(2, 0))).toBe(12)
  expect(pct(at(1, 2))).toBeGreaterThan(pct(at(0, 0)))
  const outline = () => page.evaluate(() => {
    const o = document.querySelector<SVGRectElement>('g[data-scene="heat"] [data-k-cell]')!
    return { x: Math.round(+o.getAttribute('x')!), y: Math.round(+o.getAttribute('y')!), shown: getComputedStyle(o).visibility === 'visible' && +getComputedStyle(o).opacity > 0.9 }
  })
  const first = await outline()
  expect(first.shown).toBe(true)
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(300)
  const second = await outline()
  expect(second.x).toBeLessThan(first.x) // to column 0
  expect(second.y).toBeGreaterThan(first.y) // to row 3
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(300)
  expect((await outline()).shown).toBe(false)
  await page.evaluate(() => window.klappe.stepper.prev())
  await page.evaluate(() => window.klappe.stepper.prev())
  await page.waitForTimeout(300)
  expect(await outline()).toEqual(first)
  await page.close()
})

test('a treemap sizes each tile by its share and names the ones it fits; groups keep one colour inside their block', async () => {
  const page = await open('/a/tiles/3')
  const tiles = await page.evaluate(() => [...document.querySelectorAll<SVGRectElement>('g[data-scene="tiles"] [data-k-chart] rect')].filter((t) => t.getAttribute('rx') === '4').map((t) => +t.getAttribute('width')! * +t.getAttribute('height')!))
  const total = tiles.reduce((a, b) => a + b, 0)
  // Data order: People 120 of 265 euros; the 4 px gaps make small tiles a little smaller.
  expect(tiles[2] / total).toBeGreaterThan(0.43)
  expect(tiles[2] / total).toBeLessThan(0.47)
  const texts = await page.evaluate(() => [...document.querySelectorAll('g[data-scene="tiles"] [data-k-text]')].map((e) => e.textContent))
  expect(texts).toContain('120 · 45 %')
  await page.close()

  const grouped = await open('/a/grouped/4')
  const r = await grouped.evaluate(() => {
    const g = document.querySelector('g[data-scene="grouped"] [data-k-chart]')!
    const rects = [...g.querySelectorAll<SVGRectElement>('rect')].filter((t) => t.getAttribute('rx') === '4')
    return rects.map((t) => t.style.fill)
  })
  // Product (Web, Mobile, Design), Platform (Infra, Data), Sales (Field, Inside).
  expect(new Set(r.slice(0, 3)).size).toBe(1)
  expect(new Set(r.slice(3, 5)).size).toBe(1)
  expect(r[0]).not.toBe(r[3])
  expect(r[3]).not.toBe(r[5])
  await grouped.close()
})
