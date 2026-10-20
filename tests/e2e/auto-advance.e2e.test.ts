import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'

// SceneModule.auto on the in-code fixture auto-advance. Indexes: 0 one/1, 1 one/2 (0.3 s), 2 two/1 (0.3 s), 3 two/2 (1.5 s), 4 two/3, 5 two/4.
let browser: Browser
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(hash: string, index: number): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=auto-advance${hash}`)
  await page.waitForFunction((i) => window.klappe?.stepper?.index === i, index, { timeout: 30_000 })
  return page
}
const index = (page: Page) => page.evaluate(() => window.klappe.stepper.index as number)

test('one press chains across the crt transition and stops at the first step without auto', async () => {
  const page = await open('#/a/one/1', 0)
  await page.evaluate(() => {
    const kinds: string[] = ((window as any).kinds = [])
    window.klappe.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
    window.klappe.stepper.next() // the one press
  })
  await page.waitForFunction(() => window.klappe.stepper.index === 4, undefined, { timeout: 15_000 })
  await page.waitForTimeout(2000) // longer than any auto in the fixture
  expect(await index(page)).toBe(4)
  expect(await page.evaluate(() => (window as any).kinds)).toEqual(['crt'])
  expect(await page.evaluate(() => location.hash)).toBe('#/b/two/3') // the router (and the speaker channel) heard each step
  await page.close()
})

test('a deep link onto an auto step does not advance', async () => {
  const page = await open('#/a/one/2', 1)
  await page.waitForTimeout(1000)
  expect(await index(page)).toBe(1)
  await page.close()
})

test('a manual press during the wait advances exactly one step', async () => {
  const page = await open('#/b/two/1', 2)
  await page.evaluate(() => window.klappe.stepper.next()) // plays two/2, then waits 1.5 s
  expect(await index(page)).toBe(3)
  await page.evaluate(() => window.klappe.stepper.next()) // press during the wait
  await page.waitForTimeout(2500) // past the cancelled 1.5 s timer
  expect(await index(page)).toBe(4)
  await page.close()
})
