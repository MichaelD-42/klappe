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

test('bubble maxWidth wraps the text; side top puts the tail on the top edge', async () => {
  const page = await open('?fixture=fx-motion#/a/wrap/3')
  const r = await page.evaluate(() => {
    const find = (t: string) => [...document.querySelectorAll<HTMLElement>('div')].find((d) => d.firstChild?.textContent?.startsWith(t))!
    const beside = find('A wrapped').getBoundingClientRect()
    const below = find('A bubble below')
    const b = below.getBoundingClientRect()
    const t = below.firstElementChild!.getBoundingClientRect()
    return { w: beside.width, h: beside.height, tailY: t.top + t.height / 2 - b.top, tailX: t.left + t.width / 2 - (b.left + b.width / 2) }
  })
  expect(r.w).toBeLessThanOrEqual(400)
  expect(r.h).toBeGreaterThan(120) // wrapped onto more than one line
  expect(Math.abs(r.tailY)).toBeLessThan(3)
  expect(Math.abs(r.tailX)).toBeLessThan(3)
  await page.close()
})

test('a shown mesh3d does not read computed style per frame', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.addInitScript(() => {
    const gcs = window.getComputedStyle
    ;(window as any).canvasReads = 0
    window.getComputedStyle = function (e: Element, p?: string | null) {
      if (e instanceof HTMLCanvasElement) (window as any).canvasReads++
      return gcs.call(window, e, p)
    }
  })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-motion#/a/wrap/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  await page.evaluate(() => ((window as any).canvasReads = 0))
  await page.waitForTimeout(500)
  expect(await page.evaluate(() => (window as any).canvasReads)).toBe(0)
  await page.close()
})

test('a shown mesh3d stops drawing when another canvas is active', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.addInitScript(() => {
    const clear = CanvasRenderingContext2D.prototype.clearRect
    ;(window as any).draws = 0
    CanvasRenderingContext2D.prototype.clearRect = function (...a: [number, number, number, number]) {
      ;(window as any).draws++
      return clear.apply(this, a)
    }
  })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-motion#/a/wrap/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const draws = () => page.evaluate(() => (window as any).draws as number)
  const d0 = await draws()
  await page.waitForTimeout(300)
  expect(await draws()).toBeGreaterThan(d0) // drawing on its own canvas
  await page.evaluate(() => {
    const k = window.klappe
    return k.stepper.goto(k.steps.findIndex((s: { section: string }) => s.section === 'b'), 'cut')
  })
  await page.waitForTimeout(100)
  const d1 = await draws()
  await page.waitForTimeout(500)
  expect(await draws()).toBe(d1)
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

// Play starts from where the shape sits: the first frames of a morph do not jump.
test('a morph starts from the shape as it stands', async () => {
  const page = await open('?fixture=fx-motion#/a/chain/1')
  const moves = await page.evaluate(async () => {
    const doc = [...document.querySelectorAll<HTMLElement>('[data-scene="chain"] div')].find((e) => e.textContent === 'Doc')!
    const centre = () => {
      const r = doc.getBoundingClientRect()
      return [r.left + r.width / 2, r.top + r.height / 2]
    }
    const [x0, y0] = centre()
    window.klappe.stepper.next()
    const out: number[] = []
    for (let k = 0; k < 3; k++) {
      await new Promise(requestAnimationFrame)
      const [x, y] = centre()
      out.push(Math.hypot(x - x0, y - y0))
    }
    return out
  })
  expect(moves[0]).toBeLessThan(2) // power2.inOut: the first frame barely moves
  await page.close()
})

// Runs in the page with a bare ctx: show(tl, "<") pops a bubble in together with the one before; show(tl) appends.
test('bubble show takes a position, like hide', async () => {
  const page = await open('?fixture=fx-motion#/a/talk/1')
  // A string, so neither vitest nor tsc rewrites the import: the page loads the module from Vite.
  await page.evaluate("import('/src/fx/motion.ts').then((m) => { window.__bubble = m.bubble })")
  const r = await page.evaluate(() => {
    const html = document.body.appendChild(document.createElement('div'))
    const bubble = (window as any).__bubble
    const [a, b, c] = ['A', 'B', 'C'].map((text) => bubble({ html }, { x: 100, y: 100, text }))
    const tl = new (window.klappe.canvases[0].tl.constructor as any)({ paused: true })
    a.show(tl)
    b.show(tl, '<')
    c.show(tl)
    const starts = tl.getChildren().map((t: any) => t.startTime())
    html.remove()
    return starts
  })
  expect(r[1]).toBe(r[0])
  expect(r[2]).toBeGreaterThan(r[1])
  await page.close()
})
