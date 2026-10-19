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

// The snapshot also covers dash draw-ons, glows and tints.
for (const prop of ['strokeDasharray', 'strokeDashoffset', 'filter', 'fillOpacity', 'color'])
  test(`walk fails when onUpdate writes wall-clock state into ${prop}`, async () => {
    const r = await walk(`style-clock&prop=${prop}`)
    expect(r.ok).toBe(false)
    expect(r.checks.find((c) => !c.ok)?.name).toContain('play≠seek')
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

test('a data file that does not parse shows DATA ERROR and records a problem', async () => {
  const page = await open('?fixture=media-layout#/a/media/5')
  const box = await page.evaluate(() => document.querySelector('div[data-k-media="5"]')?.textContent)
  expect(box).toBe('DATA ERROR: data/broken.json')
  const problems: string[] = await page.evaluate(() => window.klappe.problems)
  expect(problems.some((p) => p.includes('DATA ERROR: data/broken.json'))).toBe(true)
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
