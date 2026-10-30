import { chromium, type Page } from '@playwright/test'
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
    // The browser logs some errors itself (an SVG attribute it cannot parse): they never pass through
    // console.error in the page, so klappe.errors misses them. Collected here, they fail the walk too.
    const browserErrors: string[] = []
    // A message logged by a third-party frame (a YouTube embed's permission notices) is not the deck's error.
    const ownOrigin = new URL(url).origin
    const fromDeck = (src: string) => !src || src.startsWith(ownOrigin) || src.startsWith('data:')
    page.on('console', (m) => m.type() === 'error' && fromDeck(m.location().url) && browserErrors.push(m.text()))
    let errored: () => void = () => {}
    const firstError = new Promise<void>((ok) => (errored = ok))
    page.on('pageerror', (e) => (browserErrors.push(e.message), errored()))
    await page.goto(url)
    // main publishes the steps before the self-test starts; a page without klappe gets the base wait.
    const loaded = () => !!((window as any).klappe?.steps || document.querySelector('script#klappe-selftest'))
    const ready = page.waitForFunction(loaded, undefined, { timeout: BASE_MS }).catch(() => {})
    // A deck that cannot load (a syntax error in a scene.ts) throws before it publishes: give it a few seconds, then fail.
    await Promise.race([ready, firstError.then(() => page.waitForFunction(loaded, undefined, { timeout: 5_000 }).catch(() => {}))])
    if (browserErrors.length && !(await page.evaluate(loaded))) {
      const overlay = await page.evaluate(() => document.querySelector('vite-error-overlay')?.shadowRoot?.querySelector('.message')?.textContent ?? '')
      throw new Error(`the deck did not load (${url}):\n${[overlay, ...browserErrors].filter(Boolean).join('\n')}`)
    }
    const steps = await page.evaluate(() => (window as any).klappe?.steps?.length ?? 0)
    const json = await page
      .locator('script#klappe-selftest')
      .evaluate((el) => el.textContent, undefined, { timeout: selftestTimeout(steps) })
    if (!json?.trim()) throw new Error(`the self-test wrote an empty result (${url})`)
    const r = JSON.parse(json) as SelftestResult
    // klappe.errors already holds console.error calls and page errors; add only what the browser logged on its own.
    r.errors.push(...browserErrors.filter((e) => !r.errors.some((k) => k.includes(e) || e.includes(k))))
    if (r.errors.length) r.ok = false
    return r
  } finally {
    await browser.close()
  }
}

// Waits until the page is still: web fonts in, every queued move played, and two frames drawn after it.
export const settle = (page: Page) =>
  page.evaluate(async () => {
    await document.fonts.ready
    await window.klappe.stepper.idle
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
  })
