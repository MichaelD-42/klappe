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
      .evaluate((el) => el.textContent, undefined, { timeout: 110_000 }) // the ac worst case: 12 checks of 8 s; vitest allows 120 s
    if (!json?.trim()) throw new Error(`the self-test wrote an empty result (${url})`)
    return JSON.parse(json) as SelftestResult
  } finally {
    await browser.close()
  }
}
