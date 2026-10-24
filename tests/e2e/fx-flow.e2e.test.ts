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
    expect(r.problems).toEqual(['flow: label of "x" too long'])
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
