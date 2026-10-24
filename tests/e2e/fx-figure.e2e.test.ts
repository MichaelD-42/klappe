import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`figures walk and gather, play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-figure`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBe(6)
    expect(r.ok).toBe(true)
  })

// The pose map: a lifted leg swings the opposite arm, and the two legs are never lifted together.
test('a walking figure lifts one leg at a time and swings the opposite arm', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-figure#/a/walk/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const poses = await page.evaluate(() => {
    const { canvases, steps } = window.klappe
    const i = steps.findIndex((s: any) => s.scene === 'walk' && s.step === 2)
    const tl = canvases[steps[i].canvas].tl
    const [a, b] = [tl.labels[`e:${i - 1}`], tl.labels[`e:${i}`]]
    const root = document.querySelector('[data-scene="walk"] [data-k-figure]')!
    // Joints in build order: right thigh, left thigh, right arm, left arm (screen left first).
    const joints = [...root.children].filter((e) => e.localName === 'g').slice(0, 4)
    const turned = (g: Element) => Math.abs(Number(/rotate\(([-\d.e]+)/.exec(g.getAttribute('transform') ?? '')?.[1] ?? 0)) > 0.01
    const out: boolean[][] = []
    for (let k = 1; k < 40; k++) {
      tl.seek(a + ((b - a) * k) / 40, false)
      out.push(joints.map(turned))
    }
    return out
  })
  expect(poses.some(([l0]) => l0)).toBe(true) // it does walk
  for (const [l0, l1, a0, a1] of poses) {
    expect(l0 && l1).toBe(false)
    expect(l0).toBe(a1)
    expect(l1).toBe(a0)
  }
  await browser.close()
}, 30_000)

test('figure takes a stroke width, and appear() a position', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-figure`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await page.evaluate(async () => {
    const { figure } = await (new Function('p', 'return import(p)') as (p: string) => Promise<any>)('/src/fx/figure.ts') // a string: vitest would rewrite import()
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    document.querySelector('svg')!.append(svg)
    const f = figure({ svg } as any, { x: 0, y: 0, color: 'red', strokeWidth: 10 })
    const Timeline = window.klappe.canvases[0].tl.constructor
    const tl = new Timeline({ paused: true })
    tl.to({}, { duration: 3 })
    f.appear(tl, 0.5)
    const out = { width: (svg.lastElementChild as SVGElement).style.strokeWidth, start: tl.recent().startTime() }
    svg.remove()
    return out
  })
  expect(r.width).toBe('10')
  expect(r.start).toBe(0.5)
  await browser.close()
}, 30_000)
