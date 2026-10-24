import { chromium } from '@playwright/test'
import type { SelftestResult } from '../../src/types'
export type { SelftestCheck, SelftestResult } from '../../src/types'

const BASE_MS = 110_000 // the ac worst case: 12 checks of 8 s
const STEP_MS = 200 // the walk took about 50 ms per step on a 644-step deck; 4x headroom for a busy machine

// How long the driver waits for the result: 110 s plus a budget per step, so a big deck's walk fits.
export const selftestTimeout = (steps: number) => BASE_MS + steps * STEP_MS

export async function runSelftest(
  url: string,
  viewport: { w: number; h: number } = { w: 1920, h: 1080 },
): Promise<SelftestResult> {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: viewport.w, height: viewport.h } })
    await page.goto(url)
    // main publishes the steps before the self-test starts; a page without klappe gets the base wait.
    await page
      .waitForFunction(() => (window as any).klappe?.steps || document.querySelector('script#klappe-selftest'), undefined, { timeout: BASE_MS })
      .catch(() => {})
    const steps = await page.evaluate(() => (window as any).klappe?.steps?.length ?? 0)
    const json = await page
      .locator('script#klappe-selftest')
      .evaluate((el) => el.textContent, undefined, { timeout: selftestTimeout(steps) })
    if (!json?.trim()) throw new Error(`the self-test wrote an empty result (${url})`)
    return JSON.parse(json) as SelftestResult
  } finally {
    await browser.close()
  }
}
