import { chromium } from '@playwright/test'
import { expect, inject, test } from 'vitest'
import { settle } from './driver'

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

// The overview focused its marker, which scrolled the overflow-hidden stage 60 px: a band of stage
// background showed at the bottom at 1366x768, and stayed after the overview closed.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`the stage covers the window at ${vp.w}x${vp.h}, also after the overview`, async () => {
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
      await page.goto(inject('BASE_URL'))
      await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
      const covers = async () => {
        const r = await page.evaluate(() => {
          const s = document.querySelector('.k-stage')!
          const { left, top, right, bottom } = s.getBoundingClientRect()
          return { left, top, right, bottom, scroll: s.scrollTop + s.scrollLeft }
        })
        expect(r.scroll).toBe(0)
        expect(Math.abs(r.left) + Math.abs(r.top)).toBeLessThanOrEqual(1)
        expect(vp.w - r.right).toBeLessThanOrEqual(1)
        expect(vp.h - r.bottom).toBeLessThanOrEqual(1)
      }
      await covers()
      await page.keyboard.press('End') // the marker of the last scene sits at the bottom of the overview
      await settle(page)
      await page.keyboard.press('o')
      await page.waitForTimeout(500)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(500)
      await covers()
    } finally {
      await browser.close()
    }
  })
