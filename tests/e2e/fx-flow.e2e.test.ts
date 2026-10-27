import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// The fixture's one over-long label is its only problem.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and flow text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-flow`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['sections/10-a/40-long/scene.ts step 1: flow: label of "x" too long'])
  })

test('a first highlight (nothing to turn off) logs no GSAP warning', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    const logs: string[] = []
    page.on('console', (m) => logs.push(m.text()))
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-flow#/a/parts/3`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    expect(logs.filter((l) => l.includes('GSAP target'))).toEqual([])
  } finally {
    await browser.close()
  }
})

test('node kinds draw their outline; dim fades nodes and their arrows, dim([]) brings them back', async () => {
  const { chromium } = await import('@playwright/test')
  const { settle } = await import('./driver')
  const browser = await chromium.launch()
  try {
    const at = async (step: number) => {
      const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
      await page.goto(`${inject('BASE_URL')}/?fixture=fx-flow#/a/kinds/${step}`)
      await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
      await settle(page)
      const r = await page.evaluate(() => {
        const node = (id: string) => document.querySelector<HTMLElement>(`[data-scene="kinds"] [data-k-flow-node="${id}"]`)!
        const op = (e: Element) => +(+getComputedStyle(e).opacity).toFixed(2)
        return {
          kinds: ['start', 'ok', 'db', 'ship'].map((id) => node(id).dataset.kFlowKind ?? 'box'),
          outlines: ['start', 'ok', 'db', 'ship'].map((id) => !!node(id).querySelector('svg[data-k-flow-shape]')),
          nodes: ['start', 'ok', 'db', 'ship'].map((id) => op(node(id))),
          // The arrows in the kinds scene, in edge order: start→ok, ok→db, ok→ship.
          edges: [...document.querySelectorAll('[data-scene="kinds"] path[data-k-flow-edge]')].map(op),
        }
      })
      await page.close()
      return r
    }
    const dimmed = await at(2)
    expect(dimmed.kinds).toEqual(['terminal', 'decision', 'store', 'box'])
    expect(dimmed.outlines).toEqual([true, true, true, false])
    expect(dimmed.nodes).toEqual([0.35, 1, 0.35, 0.35])
    expect(dimmed.edges).toEqual([0.35, 0.35, 0.35])
    const back = await at(3)
    expect(back.nodes).toEqual([1, 1, 1, 1])
    expect(back.edges).toEqual([1, 1, 1])
  } finally {
    await browser.close()
  }
})
