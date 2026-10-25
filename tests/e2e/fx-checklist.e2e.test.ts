import { chromium } from '@playwright/test'
import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// The fixture causes exactly two problems: a tick of a missing item and a list too tall for its rect.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and checklist text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-checklist`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['checklist: no item 7', 'checklist: 30 items do not fit 600px at 20px text'])
  })

// The order scene makes its tick adders out of step order: only the box of the latest tick is lit.
test('tick adders built out of step order light the box of the latest tick only', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    const boxes = async (step: number) => {
      await page.goto(`${inject('BASE_URL')}/?fixture=fx-checklist#/a/order/${step}`)
      await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
      await page.waitForTimeout(300)
      return page.evaluate(() => {
        const root = document.querySelector<HTMLElement>('div[data-scene="order"]')!
        const probe = root.appendChild(document.createElement('i'))
        const token = (t: string) => ((probe.style.color = `var(${t})`), getComputedStyle(probe).color)
        const tk = { line: token('--k-line'), accent: token('--k-accent') }
        return [...root.querySelectorAll('rect')].map((r) => {
          const c = getComputedStyle(r).stroke
          return c === tk.accent ? 'accent' : c === tk.line ? 'line' : c
        })
      })
    }
    expect(await boxes(2)).toEqual(['accent', 'line', 'line'])
    expect(await boxes(3)).toEqual(['line', 'accent', 'line'])
    expect(await boxes(4)).toEqual(['line', 'line', 'accent'])
  } finally {
    await browser.close()
  }
}, 90_000)
