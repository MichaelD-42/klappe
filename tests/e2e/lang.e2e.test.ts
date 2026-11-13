import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// The fixture lang: an English deck with lang/de.md. "Untranslated." has no German text.
let browser: Browser
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(query: string): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=lang${query}#/a/b/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}
const shown = (page: Page) =>
  page.evaluate(() => ({
    title: document.title,
    probe: document.querySelector('[data-k-probe]')?.textContent,
    lang: window.klappe.deck.meta.lang,
  }))

test('without ?lang= the deck shows as written; ?lang=de shows the German text, ctx.t strings included', async () => {
  const en = await open('')
  expect(await shown(en)).toEqual({ title: 'Talk', probe: 'Hello|Welcome.|From code', lang: 'en' })
  await en.close()
  const de = await open('&lang=de')
  expect(await shown(de)).toEqual({ title: 'Vortrag', probe: 'Hallo|Willkommen.|Aus dem Code', lang: 'de' })
  expect(await de.evaluate(() => window.klappe.problems)).toEqual([])
  await de.close()
})

test('the walk in a language warns about a missing translation and still passes', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?fixture=lang&lang=de&selftest=walk`)
  expect(r.ok).toBe(true)
  expect(r.warnings).toContain('#/a/b: no de translation for "Untranslated."')
  const en = await runSelftest(`${inject('BASE_URL')}/?fixture=lang&selftest=walk`)
  expect(en.warnings.filter((w) => w.includes('translation'))).toEqual([])
})

test('the section list offers the languages and picking one reloads at the same step in it', async () => {
  const page = await open('')
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => location.hash === '#/a/b/2')
  await page.keyboard.press('s')
  await Promise.all([page.waitForURL(/lang=de/), page.getByRole('button', { name: 'Deutsch', exact: true }).click()])
  await page.waitForFunction(() => window.klappe?.stepper?.index === 1, undefined, { timeout: 30_000 })
  expect(new URL(page.url()).hash).toBe('#/a/b/2')
  expect((await shown(page)).lang).toBe('de')
  await page.keyboard.press('s')
  await Promise.all([page.waitForURL((u) => !u.searchParams.has('lang')), page.getByRole('button', { name: 'English', exact: true }).click()])
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  expect((await shown(page)).lang).toBe('en')
  await page.close()
})

test('in a translation the review window says text edits are off, and a double click edits nothing', async () => {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const deck = await context.newPage()
  await deck.goto(`${inject('BASE_URL')}/?fixture=lang&lang=de#/a/c/1`)
  await deck.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const [review] = await Promise.all([context.waitForEvent('page'), deck.keyboard.press('r')])
  await review.waitForSelector('.k-review textarea', { timeout: 30_000 })
  await expect.poll(() => review.locator('.k-review').textContent(), { timeout: 10_000 }).toContain('Textänderungen schreiben scene.md') // the window speaks the language shown
  const h2 = deck.locator('div[data-scene="c"] h2')
  expect(await h2.textContent()).toBe('Schlicht')
  await h2.dblclick()
  expect(await h2.evaluate((e) => (e as HTMLElement).isContentEditable)).toBe(false)
  await context.close()
})
