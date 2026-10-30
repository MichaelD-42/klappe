import { chromium } from '@playwright/test'
import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// A Markdown step is one fade of motion.step and two 1 ms pads; a step into the next scene adds the camera flight.
test('tempo: slow stretches the step fade and the camera flight by 1.4, and the walk still passes', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=tempo`)
  expect(r.problems).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage()
    await page.goto(`${inject('BASE_URL')}/?fixture=tempo`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    const [step, flight] = await page.evaluate(() => {
      const l = window.klappe.canvases[0].tl.labels
      return [l['e:1'] - l['e:0'], l['e:2'] - l['e:1']]
    })
    expect(step).toBeCloseTo(0.6 * 1.4 + 0.002, 3)
    expect(flight).toBeGreaterThanOrEqual(1.6 * 1.4)
  } finally {
    await browser.close()
  }
}, 120_000)
