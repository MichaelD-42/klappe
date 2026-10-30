import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=overlay${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

const read = (page: Page) =>
  page.evaluate(() => {
    const layer = document.querySelector<HTMLElement>('.k-stage > .k-deck-overlay')!
    const logo = layer.querySelector<HTMLElement>('[data-logo]')!
    const label = layer.querySelector<HTMLElement>('[data-label]')!
    const r = logo.getBoundingClientRect()
    const kids = [...layer.parentElement!.children].map((e) => e.className)
    const clear = [layer, ...layer.children].every((e) => getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)')
    return { label: label.textContent, logo: getComputedStyle(logo).visibility, at: [Math.round(r.x), Math.round(r.y)], order: kids, clear }
  })

test('walk: the overlay is the same after a play and a jump', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=overlay`)
  expect(r.errors).toEqual([])
  expect(r.problems).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
}, 120_000)

test('the overlay sits between the canvases and the UI, follows the step, and stays put while the camera moves', async () => {
  const page = await open('#/intro/hello/1')
  const intro = await read(page)
  expect(intro.order).toEqual(['k-worlds', 'k-deck-overlay', 'k-ui'])
  expect(intro.clear).toBe(true) // the scenes show through
  expect(intro.label).toBe('Intro')
  expect(intro.logo).toBe('hidden')
  await page.evaluate(() => window.klappe.stepper.next())
  await settle(page)
  const one = await read(page)
  expect(one.label).toBe('Body')
  expect(one.logo).toBe('visible')
  await page.evaluate(() => window.klappe.stepper.next())
  await settle(page)
  expect((await read(page)).at).toEqual(one.at)
  // Back to the title section with a step back: the overlay follows a back move too.
  await page.evaluate(async () => (await window.klappe.stepper.prev(), window.klappe.stepper.prev()))
  await settle(page)
  expect(await read(page)).toMatchObject({ label: 'Intro', logo: 'hidden' })
  await page.close()
}, 60_000)
