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
