import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=components${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

const shown = (page: Page, sel: string) =>
  page.evaluate((s) => [...document.querySelectorAll<HTMLElement>(s)].map((e) => getComputedStyle(e).visibility), sel)

test('walk: a component scene is the same after a play and a jump; the problems are the shadowed, the unknown and the throwing fence', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=components`)
  expect(r.errors).toEqual(['sections/10-a/40-broken/scene.md step 1: broken: no photo'])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems.sort()).toEqual([
    "components.ts: 'ts' is a built-in fence; the built-in wins",
    'sections/10-a/20-plain/scene.md: language "nope" not bundled; shown plain',
    'sections/10-a/40-broken/scene.md step 1: EFFECT MISSING: broken (no photo)',
  ])
}, 120_000)

test('a registered fence draws the scene from its body, info and scene.md; its steps are the scene.md steps', async () => {
  const page = await open('#/a/own/1')
  expect(await page.evaluate(() => window.klappe.steps.filter((s: { scene: string }) => s.scene === 'own').length)).toBe(2)
  expect(await page.evaluate(() => document.querySelector<HTMLElement>('div[data-scene="own"] [data-stamp]')?.dataset.stamp)).toBe('wide')
  expect(await page.evaluate(() => document.querySelector('div[data-scene="own"] [data-stamp]')?.textContent)).toBe('Hello')
  expect(await page.evaluate(() => document.querySelectorAll('div[data-scene="own"] h2, div[data-scene="own"] p[data-step]').length)).toBe(0)
  expect(await shown(page, 'div[data-scene="own"] [data-stamp], div[data-scene="own"] [data-stamp-next]')).toEqual(['visible', 'hidden'])
  await page.evaluate(() => window.klappe.stepper.next())
  await settle(page)
  expect(await shown(page, 'div[data-scene="own"] [data-stamp], div[data-scene="own"] [data-stamp-next]')).toEqual(['visible', 'visible'])
  await page.close()
}, 60_000)

test('a component named like a built-in fence never runs: the built-in draws the scene', async () => {
  const page = await open('#/a/shadow/1')
  expect(await page.evaluate(() => document.querySelectorAll('[data-shadow]').length)).toBe(0)
  expect(await page.evaluate(() => document.querySelector('div[data-scene="shadow"]')?.textContent)).toContain('const a = 1;')
  await page.close()
}, 60_000)
