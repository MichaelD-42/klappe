import { chromium } from '@playwright/test'

export interface SelftestCheck {
  name: string
  ok: boolean
  detail?: string
}
export interface SelftestResult {
  mode: string
  ok: boolean
  steps: number
  checks: SelftestCheck[]
  problems: string[]
  errors: string[]
}

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
