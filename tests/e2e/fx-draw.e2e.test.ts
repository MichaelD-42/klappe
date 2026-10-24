import { chromium, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { createServer } from 'vite'
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
  test(`fx-draw walks clean at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-draw`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.ok).toBe(true)
    expect(r.steps).toBe(6)
  })

// The dash state of each scene's shapes after a cut to global step i: [dasharray, dashoffset] per shape.
async function dashes(page: Page, i: number) {
  return page.evaluate(async (i) => {
    await window.klappe.stepper.goto(i, 'cut')
    const of = (scene: string) =>
      [...document.querySelectorAll(`g[data-scene="${scene}"] :is(path, rect, circle)`)].map((s) => {
        const st = getComputedStyle(s)
        return [st.strokeDasharray, parseFloat(st.strokeDashoffset)] as const
      })
    return { desk: of('desk'), stream: of('stream'), shapes: of('shapes') }
  }, i)
}

test('drawOn hides strokes until its step and ends on a plain stroke, play or cut', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-draw`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })

  let d = await dashes(page, 0)
  const hidden = (k: number, n: number) => Array(n).fill([`${1.01 * k}px, ${2 * k}px`, 1.3 * k])
  const plainStroke = (n: number) => Array(n).fill('none')
  expect(d.desk.map(([a]) => a)).toEqual(plainStroke(57))
  // Not yet drawn: k = 1 for scaling strokes.
  expect(d.stream).toEqual(hidden(1, 44))

  d = await dashes(page, 4)
  expect(d.shapes.slice(0, 3).map(([a]) => a)).toEqual(plainStroke(3))
  // Non-scaling strokes in a scale(5) group: the dash scales by the CTM scale, k = 5.
  expect(d.shapes.slice(3)).toEqual(hidden(5, 3))

  d = await dashes(page, 5)
  expect(d.shapes.map(([a]) => a)).toEqual(plainStroke(6))
  // Back again: the cut restores the hidden state.
  d = await dashes(page, 4)
  expect(d.shapes.slice(3)).toEqual(hidden(5, 3))
  await page.close()
})

test('the glow turns the bulb warm', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-draw`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const bulb = (i: number) =>
    page.evaluate(async (i) => {
      await window.klappe.stepper.goto(i, 'cut')
      const b = document.querySelector('g[data-scene="desk"] .bulb')!
      const root = getComputedStyle(document.documentElement)
      return { color: getComputedStyle(b).color, filter: getComputedStyle(b).filter, warm: root.getPropertyValue('--k-phosphor-amber').trim() }
    }, i)
  const before = await bulb(0)
  const after = await bulb(1)
  expect(before.color).not.toBe(after.color)
  expect(after.color).toBe('rgb(255, 181, 71)') // --k-phosphor-amber #ffb547
  expect(after.filter).toContain('22px')
  await page.close()
})

// Runs in the page: unit tests have no DOM, and lineArt needs DOMParser and computed styles.
test('lineArt keeps drawing content only and normalises inline-styled exports', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-draw`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  // A string, so neither vitest nor tsc rewrites the import: the page loads the module from Vite.
  await page.evaluate("import('/src/fx/draw.ts').then((m) => { window.__lineArt = m.lineArt })")
  const r = await page.evaluate(async () => {
    const lineArt = (window as any).__lineArt
    const nasty = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" onload="window.__pwned=1">
      <script>window.__pwned=2</script>
      <style>path { stroke: red }</style>
      <foreignObject width="10" height="10"><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>
      <path d="M0 0 H100" style="stroke:#ff0000;fill:#0000ff;stroke-width:3;stroke-linecap:butt" onclick="window.__pwned=3"/>
      <a href="javascript:window.__pwned=4"><path d="M0 50 H100" fill="blue" stroke="red"/></a>
    </svg>`
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    svg.append(g)
    document.body.append(svg)
    const problems: string[] = []
    lineArt({ svg: g, problem: (m: string) => problems.push(m) } as any, { src: nasty, x: 0, y: 0, w: 100 })
    g.querySelector('path')!.dispatchEvent(new MouseEvent('click'))
    const paths = [...g.querySelectorAll('path')].map((p) => {
      const s = getComputedStyle(p)
      return [s.stroke, s.fill, s.strokeLinecap, s.strokeWidth]
    })
    const out = {
      problems,
      banned: g.querySelectorAll('script, style, foreignObject').length,
      handlers: [...g.querySelectorAll('*')].flatMap((e) => [...e.attributes].map((a) => a.name)).filter((n) => /^on/i.test(n)),
      hrefs: [...g.querySelectorAll('a')].map((a) => a.getAttribute('href')),
      paths,
      fg: getComputedStyle(g.firstElementChild!).color,
      pwned: (window as any).__pwned,
    }
    svg.remove()
    return out
  })
  expect(r.problems).toEqual([])
  expect(r.banned).toBe(0)
  expect(r.handlers).toEqual([])
  expect(r.hrefs).toEqual([null])
  expect(r.pwned).toBeUndefined()
  // Inline fill and stroke lose to the normalised look; the author's stroke-width stays.
  expect(r.paths).toEqual([
    [r.fg, 'none', 'round', '3px'],
    [r.fg, 'none', 'round', '4px'],
  ])
  await page.close()
})

// Deck code imports the shipped art through the klappe/fx alias of the real Vite config.
test('klappe/fx/art/*.svg?raw resolves through the Vite config', async () => {
  const server = await createServer({
    configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
    server: { middlewareMode: true },
    appType: 'custom',
  })
  try {
    for (const name of ['engineer-desk', 'value-stream']) {
      const m = await server.ssrLoadModule(`klappe/fx/art/${name}.svg?raw`)
      expect(m.default).toMatch(/^<svg [^>]*viewBox=/)
    }
  } finally {
    await server.close()
  }
})

// Author art is trusted, but an exported SVG must not run code or fetch anything once it is in the deck.
test('lineArt strips tricks that run code or fetch, and leaves defs, clip paths and masks alone', async () => {
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-draw`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await page.evaluate(async () => {
    const { lineArt } = await (new Function('p', 'return import(p)') as (p: string) => Promise<any>)('/src/fx/draw.ts') // a string: vitest would rewrite import()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    document.body.append(svg)
    const src = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 100 100">
      <defs><clipPath id="c"><rect width="50" height="50"/></clipPath><mask id="m"><circle r="9" fill="white"/></mask></defs>
      <a href="java&#9;script:alert(1)"><path d="M0 0L9 9"/></a>
      <a xlink:href=" jav&#x0A;ascript:alert(2)"><line x1="0" y1="0" x2="5" y2="5"/></a>
      <set attributeName="onclick" to="alert(3)"/><animate attributeName="href" to="javascript:alert(4)"/>
      <use href="https://example.com/x.svg#a"/><use href="#c"/><image href="https://example.com/x.png"/>
      <path d="M0 0L5 5" clip-path="url(#c)"/></svg>`
    const problems: string[] = []
    lineArt({ svg, html: document.body, problem: (p: string) => problems.push(p) } as any, { src, x: 0, y: 0, w: 100 })
    const g = svg.lastElementChild!
    const hrefs = [...g.querySelectorAll('*')].flatMap((e) => [...e.attributes].filter((a) => /href$/.test(a.name)).map((a) => a.value))
    svg.remove()
    return {
      problems,
      hrefs,
      left: [...g.querySelectorAll('set, animate, image')].length,
      clipFill: (g.querySelector('clipPath rect') as SVGElement).style.fill,
      maskFill: (g.querySelector('mask circle') as SVGElement).style.fill,
      drawnFill: (g.querySelector('path') as SVGElement).style.fill,
    }
  })
  expect(r.problems).toEqual([])
  expect(r.hrefs).toEqual(['#c']) // only the in-file reference stays
  expect(r.left).toBe(0)
  expect(r.clipFill).toBe('')
  expect(r.maskFill).toBe('')
  expect(r.drawnFill).toBe('none')
  await page.close()
})
