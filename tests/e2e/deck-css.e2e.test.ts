import { chromium } from '@playwright/test'
import { describe, expect, inject, test } from 'vitest'

// decks/demo/deck.css sets a marker variable and a url() rule; other decks may have no deck.css.
describe.skipIf(!inject('IS_DEMO_DECK'))('deck.css on klappe decks/demo', () => {
  test('applies after the klappe styles and the theme, resolves url() in the deck folder, and stays out of fixtures', async () => {
    const browser = await chromium.launch()
    try {
      const page = await browser.newPage()
      await page.goto(inject('BASE_URL'))
      await page.waitForFunction(() => window.klappe?.stepper, undefined, { timeout: 30_000 })
      const r = await page.evaluate(async () => {
        const probe = Object.assign(document.createElement('div'), { className: 'k-deck-css-probe' })
        document.body.append(probe)
        const url = /url\("(.+)"\)/.exec(getComputedStyle(probe).backgroundImage)?.[1] ?? ''
        return {
          marker: getComputedStyle(document.documentElement).getPropertyValue('--k-deck-css').trim(),
          url,
          status: url ? (await fetch(url)).status : 0,
          // The deck's <style> comes after the theme's, so the deck wins at equal specificity.
          afterTheme: (() => {
            const all = [...document.head.querySelectorAll('style')]
            return all.findIndex((s) => s.hasAttribute('data-k-deck-css')) > all.map((s) => s.hasAttribute('data-k-theme')).lastIndexOf(true)
          })(),
        }
      })
      expect(r.marker).toBe('loaded')
      expect(r.url).toMatch(/opening-backdrop.*\.png/)
      expect(r.status).toBe(200)
      expect(r.afterTheme).toBe(true)

      await page.goto(`${inject('BASE_URL')}/?fixture=two-scenes`)
      await page.waitForFunction(() => window.klappe?.stepper, undefined, { timeout: 30_000 })
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--k-deck-css'))).toBe('')
    } finally {
      await browser.close()
    }
  })
})
