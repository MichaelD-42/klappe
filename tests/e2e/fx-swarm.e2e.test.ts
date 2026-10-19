import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(url: string, vp = { width: 1920, height: 1080 }): Promise<Page> {
  const page = await browser.newPage({ viewport: vp })
  await page.goto(`${inject('BASE_URL')}/${url}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const fixture of ['fx-swarm', 'fx-motion'])
  for (const vp of [
    { w: 1920, h: 1080 },
    { w: 1366, h: 768 },
    { w: 1024, h: 768 },
  ])
    test(`${fixture} walk passes at ${vp.w}x${vp.h}`, async () => {
      const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=${fixture}`, vp)
      expect(r.errors).toEqual([])
      expect(r.problems).toEqual([])
      expect(r.checks.filter((c) => !c.ok)).toEqual([])
      expect(r.ok).toBe(true)
    })

test('the swarm canvas sits in the world and ends its step at progress 1', async () => {
  const page = await open('?fixture=fx-swarm#/a/stream/1')
  const r = await page.evaluate(() => {
    const c = document.querySelector('canvas')!
    return { inWorld: !!c.closest('.k-world'), progress: c.getAttribute('data-k-progress'), vis: getComputedStyle(c).visibility }
  })
  expect(r).toEqual({ inWorld: true, progress: '1', vis: 'visible' })
  await page.close()
})

test('each counter shows from before its step and to after it', async () => {
  const page = await open('?fixture=fx-motion#/a/talk/4')
  const texts = () => page.evaluate(() => [...document.querySelectorAll('[data-k-text]')].map((e) => e.textContent))
  expect(await texts()).toEqual(['128', '0'])
  await page.evaluate(() => window.klappe.stepper.next())
  expect(await texts()).toEqual(['0', '0'])
  await page.evaluate(() => window.klappe.stepper.next())
  expect(await texts()).toEqual(['0', '2,000'])
  await page.close()
})

test('morph keeps a transform the author set', async () => {
  const page = await open('?fixture=fx-motion#/a/shapes/1')
  const placed = () => page.evaluate(() => document.querySelector('rect')!.getBoundingClientRect().toJSON())
  const before = await placed()
  // At 1920 the camera rests on the scene at scale 1: translate(300 450) puts the square at (300, 450).
  expect(before.left).toBeCloseTo(300, 0)
  expect(before.top).toBeCloseTo(450, 0)
  expect(before.width).toBeCloseTo(160, 0)
  await page.close()
})

// Report only: the cost of one swarm redraw at 2000 points, from seeks across the stream.
test('draw-cost report: seek the 2000-point stream', async () => {
  const page = await open('?fixture=fx-swarm')
  const r = await page.evaluate(() => {
    const tl = window.klappe.canvases[0].tl
    const end = tl.labels['e:0']
    tl.pause()
    const ms: number[] = []
    for (let n = 0; n < 120; n++) {
      const t0 = performance.now()
      tl.seek(((n % 60) / 60) * end + 0.01, false)
      ms.push(performance.now() - t0)
    }
    ms.sort((a, b) => a - b)
    return { median: ms[60], p95: ms[Math.floor(ms.length * 0.95)] }
  })
  console.log(`swarm 2000 points, one seek and redraw: median ${r.median.toFixed(2)} ms, p95 ${r.p95.toFixed(2)} ms`)
  expect(r.median).toBeGreaterThan(0)
  await page.close()
})

// Report only: the average frame time while 2000 points stream at normal speed.
test('frame-time report: stream at 2000 points', async () => {
  const page = await open('?fixture=fx-swarm')
  const r = await page.evaluate(async () => {
    const c = window.klappe.canvases[0]
    const end = c.tl.labels['e:0']
    c.tl.seek(0, false)
    const frames: number[] = []
    await new Promise<void>((ok) => {
      let last = performance.now()
      c.tl.play()
      const tick = (now: number) => {
        frames.push(now - last)
        last = now
        if (c.tl.time() >= end) return c.tl.pause(), ok()
        requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    })
    frames.shift() // the first delta includes the play() call
    return { frames: frames.length, avg: frames.reduce((a, b) => a + b, 0) / frames.length, max: Math.max(...frames) }
  })
  console.log(`swarm 2000 points: ${r.frames} frames, avg ${r.avg.toFixed(1)} ms, max ${r.max.toFixed(1)} ms`)
  expect(r.frames).toBeGreaterThan(10)
  await page.close()
})
