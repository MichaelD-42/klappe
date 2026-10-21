import { chromium } from '@playwright/test'
import { expect, inject, test } from 'vitest'

test('deck content loads without errors', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    await page.goto(inject('BASE_URL'))
    await page.waitForFunction(() => window.klappe?.stepper, undefined, { timeout: 30_000 })
    expect(errors).toEqual([])
    expect(await page.evaluate(() => [...window.klappe.problems, ...window.klappe.errors])).toEqual([])
  } finally {
    await browser.close()
  }
})

// A fractional offset left a 1 px sliver of the page background at the stage edge (left 0.33 px at 1366x768).
test('the stage sits on whole pixels', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
    await page.goto(`${inject('BASE_URL')}/?fixture=two-scenes`)
    await page.waitForFunction(() => window.klappe?.stepper, undefined, { timeout: 30_000 })
    const at = () => page.evaluate(() => {
      const r = document.querySelector('.k-stage')!.getBoundingClientRect()
      return { left: r.left, top: r.top, w: r.width }
    })
    const r = await at()
    expect(r).toEqual({ left: Math.round(r.left), top: Math.round(r.top), w: r.w })
    expect(Math.abs(r.left + r.w / 2 - 683)).toBeLessThanOrEqual(0.5) // still centred
    await page.setViewportSize({ width: 1365, height: 900 })
    const s = await at()
    expect(s).toEqual({ left: Math.round(s.left), top: Math.round(s.top), w: s.w })
  } finally {
    await browser.close()
  }
})
