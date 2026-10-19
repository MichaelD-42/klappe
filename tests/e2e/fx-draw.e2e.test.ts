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
