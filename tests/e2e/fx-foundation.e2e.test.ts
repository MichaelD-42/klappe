import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

const walk = (fixture: string, vp = { w: 1366, h: 768 }) =>
  runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=${fixture}`, vp)

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(url: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/${url}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

// Review focus 1: text written from onUpdate is part of the snapshot.
test('walk passes when onUpdate writes data-k-text from progress', async () => {
  const r = await walk('k-text')
  expect(r.errors).toEqual([])
  expect(r.problems).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.ok).toBe(true)
})

test('walk fails when onUpdate writes wall-clock time into data-k-text', async () => {
  const r = await walk('k-text-clock')
  expect(r.ok).toBe(false)
  expect(r.checks.find((c) => !c.ok)?.detail).toContain('text=')
})

// The snapshot covers every property it records: break any one and the walk fails. Not visibility: with two
// values, a count written into it can land the same on play and seek; it is read as opacity is.
const RECORDED = ['opacity', 'transform', 'transformAttr', 'progress', 'strokeDasharray', 'strokeDashoffset', 'filter', 'fillOpacity', 'color', 'stroke', 'outlineColor', 'borderColor', 'zIndex']
for (const prop of RECORDED)
  test(`walk fails when onUpdate writes wall-clock state into ${prop}`, async () => {
    const r = await walk(`style-clock&prop=${prop}`)
    expect(r.ok).toBe(false)
    expect(r.checks.find((c) => !c.ok)?.name).toContain('play≠seek')
  })

// A step back must land where the deep link does, even when play and seek agree.
test('walk fails when a step back leaves the next step\'s state behind', async () => {
  const r = await walk('back-stale')
  expect(r.ok).toBe(false)
  expect(r.checks.filter((c) => !c.ok).map((c) => c.name)).toEqual(['step #/a/back/1: back≠seek'])
})

// The timeline rule at build time: a step that opens with "-=" reaches into the step before it.
test('a step whose first tween starts before the step is a deck problem naming the scene and step', async () => {
  const r = await walk('early-step')
  expect(r.problems).toEqual(['sections/10-a/10-early/scene.ts step 2: 1 tween(s) start before the step; do not begin a step with "<" or "-="'])
  expect(r.ok).toBe(false)
})

test('an unknown fixture fails the walk instead of walking another deck', async () => {
  const r = await walk('no-such-fixture')
  expect(r.ok).toBe(false)
  expect(r.problems).toContain("unknown fixture 'no-such-fixture'")
})

// Review focus 5: the default media layout stays legible and inside the frame.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`media layout is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await walk('media-layout', vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBe(5)
  })

test('each media step has its own wrapper and hides the one before', async () => {
  const page = await open('?fixture=media-layout#/a/media/3')
  const visible = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('div[data-k-media]')]
        .filter((e) => getComputedStyle(e).visibility === 'visible')
        .map((e) => e.dataset.kMedia),
    )
  expect(await page.evaluate(() => document.querySelectorAll('div[data-k-media]').length)).toBe(4)
  expect(await page.evaluate(() => document.querySelectorAll('g[data-k-media]').length)).toBe(4)
  expect(await visible()).toEqual(['3'])
  await page.evaluate(() => window.klappe.stepper.next())
  expect(await visible()).toEqual(['4'])
  await page.evaluate(() => window.klappe.stepper.goto(1, 'cut'))
  expect(await visible()).toEqual(['2'])
  await page.close()
})

test('a media slot chart reads JSON {source, rows}, shows Sample data and no title copied from the step', async () => {
  const page = await open('?fixture=media-layout#/a/media/4')
  const chart = await page.evaluate(() => {
    const g = document.querySelector('g[data-k-media="4"] [data-k-chart]')
    return { type: g?.getAttribute('data-k-chart'), text: g?.textContent ?? '', note: g?.getAttribute('data-k-note') }
  })
  expect(chart.type).toBe('bar')
  expect(chart.text).toContain('Sample data')
  expect(chart.text).not.toContain('Sales by region')
  expect(chart.note).toBe('Source: data/sales.json — klappe demo sample')
  await page.close()
})

// The problems panel sits top-left, stays small, and clicks on it do not advance.
test('the problems panel leaves the media placeholders and the scene text visible', async () => {
  const page = await open('?fixture=media-layout#/a/media/2')
  const uncovered = (step: number) =>
    page.evaluate((n) => {
      const box = document.querySelector<HTMLElement>(`div[data-k-media="${n}"] > div`)!
      const r = box.getBoundingClientRect()
      const scene = document.querySelector<HTMLElement>('[data-scene] h2')!.getBoundingClientRect()
      const pts = [
        [r.left + 2, r.top + 2], [r.right - 2, r.top + 2], [r.left + 2, r.bottom - 2], [r.right - 2, r.bottom - 2],
        [scene.left + 2, scene.top + 2],
      ]
      return pts.filter(([x, y]) => document.elementFromPoint(x, y)?.closest('.k-problems')).length
    }, step)
  const panel = () =>
    page.evaluate(() => {
      const p = document.querySelector<HTMLDetailsElement>('.k-problems')!
      const r = p.getBoundingClientRect()
      return { open: p.open, h: r.height / document.querySelector('.k-stage')!.getBoundingClientRect().height, text: p.textContent }
    })
  expect((await panel()).text).toContain('IMAGE MISSING')
  expect(await page.evaluate(() => [document.querySelector('.k-problems')!.getAttribute('aria-live'), document.querySelector('.k-problems')!.getAttribute('role')])).toEqual(['assertive', null])
  expect(await uncovered(2)).toBe(0)
  await page.click('.k-problems summary')
  const opened = await panel()
  expect(opened.open).toBe(true)
  expect(opened.h).toBeLessThanOrEqual(0.31)
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(1) // the click did not advance
  await page.click('.k-problems summary')
  await page.evaluate(() => window.klappe.stepper.goto(4, 'cut'))
  expect(await uncovered(5)).toBe(0)
  await page.close()
})

test('a data file that does not parse shows DATA ERROR and records a problem', async () => {
  const page = await open('?fixture=media-layout#/a/media/5')
  const box = await page.evaluate(() => document.querySelector('div[data-k-media="5"]')?.textContent)
  expect(box).toBe('DATA ERROR: data/broken.json')
  const problems: string[] = await page.evaluate(() => window.klappe.problems)
  expect(problems.some((p) => p.includes('scene.md step 5: chart: DATA ERROR: data/broken.json'))).toBe(true)
  await page.close()
})

test('walk passes across a blackout and a cut transition', async () => {
  const r = await walk('blackout')
  expect(r.errors).toEqual([])
  expect(r.problems).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.steps).toBe(3)
  expect(r.ok).toBe(true)
})

// A long transition plays first; the new canvas's first step starts after it.
test('the first step after a blackout waits for the blackout to end', async () => {
  const page = await open('?fixture=blackout')
  const r = await page.evaluate(async () => {
    const k = window.klappe
    const c = k.canvases[1]
    const worlds = c.el.parentElement as HTMLElement
    const label = c.tl.labels['e:1']
    let black = ''
    const done = k.stepper.next()
    // Poll each frame until the new canvas is fully shown: that is the end of the blackout.
    await new Promise<void>((ok) => {
      const tick = () => {
        if (getComputedStyle(worlds).backgroundColor !== 'rgba(0, 0, 0, 0)') black = getComputedStyle(worlds).backgroundColor
        if (c.el.style.opacity === '1') ok()
        else requestAnimationFrame(tick)
      }
      tick()
    })
    const atEnd = c.tl.time()
    await done
    return { atEnd, label, final: c.tl.time(), black, after: getComputedStyle(worlds).backgroundColor }
  })
  expect(r.black).toBe('rgb(0, 0, 0)') // --k-blackout
  expect(r.atEnd).toBeLessThan(r.label / 2) // the step has barely started
  expect(r.final).toBe(r.label)
  expect(r.after).toBe('rgba(0, 0, 0, 0)')
  await page.close()
})

// Scenes read their own text and the deck's language and intensity from ctx, instead of copying them.
test('ctx carries the scene text and the deck language and intensity', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=ctx-deck#/a/b/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await page.evaluate(() => ({
    problems: [...window.klappe.problems],
    probe: document.querySelector('[data-k-probe]')!.textContent,
    count: document.querySelector('[data-k-text]')!.textContent,
    vignette: getComputedStyle(document.querySelector('[data-k-shout="vignette"]')!).opacity,
  }))
  expect(r.problems).toEqual([])
  expect(r.probe).toBe('Aus der Datei|Zählen.,Rufen.')
  expect(r.count).toBe('2.000')
  expect(Number(r.vignette)).toBe(1) // bold: the vignette is up; calm has none
  await browser.close()
}, 30_000)
