import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`fx-icons walks clean at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-icons`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.ok).toBe(true)
    expect(r.steps).toBe(4)
  })

test('icons draw on with the v2 treatment and tiles fade in, play or cut', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-icons`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const at = (i: number) =>
    page.evaluate(async (i) => {
      await window.klappe.stepper.goto(i, 'cut')
      const shapes = (scene: string) => [...document.querySelectorAll(`g[data-scene="${scene}"] .k-icon :is(path, rect, circle, line)`)]
      const icons = shapes('icons')
      const well = document.querySelector('g[data-scene="tiles"] .k-tile rect[fill^="url"]')!
      return {
        count: icons.length,
        nonScaling: icons.every((s) => s.getAttribute('vector-effect') === 'non-scaling-stroke' && s.getAttribute('stroke-width') === '2'),
        tints: icons.filter((s) => s.getAttribute('fill') === 'currentColor').map((s) => getComputedStyle(s).fillOpacity),
        iconDash: icons.map((s) => getComputedStyle(s).strokeDasharray),
        tileDash: shapes('tiles').map((s) => getComputedStyle(s).strokeDasharray),
        wellOpacity: getComputedStyle(well).opacity,
      }
    }, i)
  const drawn = await at(0)
  expect(drawn.count).toBeGreaterThan(10)
  expect(drawn.nonScaling).toBe(true)
  expect(drawn.tints.length).toBeGreaterThan(0)
  expect(drawn.tints.every((o) => o === '0.2')).toBe(true)
  expect(drawn.iconDash.every((a) => a === 'none')).toBe(true)
  expect(drawn.tileDash.every((a) => a !== 'none')).toBe(true) // the tiles' step is next
  expect(drawn.wellOpacity).toBe('0')
  const lit = await at(1)
  expect(lit.tints.every((o) => o === '0.45')).toBe(true)
  const tiles = await at(2)
  expect(tiles.tileDash.every((a) => a === 'none')).toBe(true)
  expect(tiles.wellOpacity).toBe('1')
  await page.close()
})

test('a zero-length dot stroke stays hidden until its step', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-icons`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const dots = (i: number) =>
    page.evaluate(async (i) => {
      await window.klappe.stepper.goto(i, 'cut')
      return [...document.querySelectorAll<SVGPathElement>('g[data-scene="tiles"] .k-icon path')]
        .filter((s) => s.getTotalLength() < 0.5)
        .map((s) => getComputedStyle(s).strokeOpacity)
    }, i)
  expect(await dots(1)).toEqual(['0']) // info's dot, before the tiles' step
  expect(await dots(2)).toEqual(['1'])
  expect(await dots(1)).toEqual(['0'])
  await page.close()
})

test('a row given "<" draws and lights together', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-icons`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const starts = await page.evaluate(() => {
    const tl = window.klappe.canvases[0].tl
    // The first tween of each icon's first stroke (draw), and of each icon root (light).
    const first = (sel: string) =>
      [...document.querySelectorAll(sel)].map((e) => Math.min(...tl.getTweensOf(e).map((t: any) => t.startTime())))
    return {
      icons: first('g[data-scene="icons"] .k-icon > g > :first-child'),
      lights: first('g[data-scene="icons"] .k-icon'),
      wells: first('g[data-scene="tiles"] .k-tile > rect[fill^="url"]'),
    }
  })
  for (const s of Object.values(starts)) {
    expect(s.length).toBeGreaterThan(3)
    expect(new Set(s.map((t) => t.toFixed(3))).size).toBe(1)
  }
  await page.close()
})

// Runs in the page with a bare ctx: the handle's el is the tile's group, so a scene can move the tile.
test('iconTile returns its group as el', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-icons`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  // A string, so neither vitest nor tsc rewrites the import: the page loads the module from Vite.
  await page.evaluate("import('/src/fx/icons.ts').then((m) => { window.__iconTile = m.iconTile })")
  const r = await page.evaluate(() => {
    const svg = document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
    const g = svg.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'g'))
    const problems: string[] = []
    const h = (window as any).__iconTile({ svg: g, problem: (m: string) => problems.push(m) }, 'cpu', { x: 100, y: 100, tone: 'accent' })
    const out = { problems, isTile: h.el === g.lastElementChild && h.el.classList.contains('k-tile'), tag: h.el.tagName }
    svg.remove()
    return out
  })
  expect(r).toEqual({ problems: [], isTile: true, tag: 'g' })
  await page.close()
})

// The same bare ctx: icon's el is its glyph group; counter's el is its box, its caption the label under the number.
test('icon and counter return their element as el', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-icons`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.evaluate("Promise.all([import('/src/fx/icons.ts'), import('/src/fx/motion.ts')]).then(([i, m]) => { window.__icon = i.icon; window.__counter = m.counter })")
  const r = await page.evaluate(() => {
    const svg = document.body.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
    const html = document.body.appendChild(document.createElement('div'))
    const problems: string[] = []
    const ctx = { svg, html, problem: (m: string) => problems.push(m) }
    const i = (window as any).__icon(ctx, 'cpu', { x: 100, y: 100 })
    const n = (window as any).__counter(ctx, { x: 100, y: 100, from: 0, to: 5, label: 'n' })
    const out = {
      problems,
      icon: i.el === svg.lastElementChild && i.el.classList.contains('k-icon'),
      counter: n.el === html.lastElementChild && !!n.el.querySelector('[data-k-text]'),
      caption: n.caption === n.el.lastElementChild && n.caption.textContent === 'n',
    }
    svg.remove()
    html.remove()
    return out
  })
  expect(r).toEqual({ problems: [], icon: true, counter: true, caption: true })
  await page.close()
})
