import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-layerstack&instant=1#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}
// Each layer's top on screen, whether its outline is lit, and whether its label sits level with its slab.
const state = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll<SVGGElement>('g[data-scene="stack"] [data-k-layer]')]
      .sort((a, b) => +a.dataset.kLayer! - +b.dataset.kLayer!)
      .map((g) => {
        const b = g.getBoundingClientRect()
        const label = document.querySelector(`div[data-scene="stack"] [data-k-layer-label="${g.dataset.kLayer}"]`)!.getBoundingClientRect()
        return { top: Math.round(b.top), bottom: Math.round(b.bottom), lit: +getComputedStyle(g.lastElementChild!).opacity > 0.9, level: label.top > b.top && label.bottom < b.bottom }
      }),
  )

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: the layer stack plays as it seeks at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-layerstack`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/20-bad/scene.ts step 1: layerStack: label "A layer name far too long for the narrow label column" too long',
      'sections/10-a/20-bad/scene.ts step 2: layerStack: no layer 7; the layers are 0 to 1',
    ])
  })

test('the stack opens, lights one layer at a time and closes again', async () => {
  const at = async (step: number) => {
    const page = await open(`/a/stack/${step}`)
    const s = await state(page)
    await page.close()
    return s
  }
  const shut = await at(1)
  const apart = await at(2)
  // Closed, each slab overlaps the next (front faces over its top face); apart, a gap opens between them.
  for (let i = 1; i < 4; i++) {
    expect(shut[i].top).toBeLessThan(shut[i - 1].bottom)
    expect(apart[i].top).toBeGreaterThan(apart[i - 1].top + (shut[i].top - shut[i - 1].top))
  }
  expect(apart.every((l) => l.level)).toBe(true)
  expect((await at(3)).map((l) => l.lit)).toEqual([false, true, false, false])
  expect((await at(4)).map((l) => l.lit)).toEqual([false, false, true, false])
  const closed = await at(5)
  expect(closed.map((l) => l.lit)).toEqual([false, false, false, false])
  expect(closed.map((l) => l.top)).toEqual(shut.map((l) => l.top))
}, 90_000)
