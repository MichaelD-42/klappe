import { chromium } from '@playwright/test'
import type { SelftestResult } from '../../src/types'
export type { SelftestCheck, SelftestResult } from '../../src/types'

export async function runSelftest(
  url: string,
  viewport: { w: number; h: number } = { w: 1920, h: 1080 },
): Promise<SelftestResult> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } })
    await page.goto(url)
    const json = await page
      .locator('script#klappe-selftest')
      .evaluate((el) => el.textContent, undefined, { timeout: 90_000 })
    return JSON.parse(json ?? '') as SelftestResult
  } finally {
    await browser.close()
  }
}
