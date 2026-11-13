import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'

// The talk clock on the fixture clock, a one-minute talk in English (so 2:32 PM), with the page's clock under the test's control.
let browser: Browser
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(context = browser): Promise<Page> {
  const page = await context.newPage()
  await page.clock.install({ time: new Date('2026-11-13T14:32:00') })
  await page.goto(`${inject('BASE_URL')}/?fixture=clock#/a/b/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}
const chip = (page: Page) => page.locator('.k-clock')
const look = (page: Page) =>
  chip(page).evaluate((e) => {
    const left = e.querySelector('.k-clock-talk') as HTMLElement
    const tone = getComputedStyle(left).color
    const probe = (v: string) => {
      const p = document.body.appendChild(document.createElement('i'))
      p.style.color = `var(${v})`
      const c = getComputedStyle(p).color
      p.remove()
      return c
    }
    return { text: e.textContent, tone: tone === probe('--k-bad') ? 'bad' : tone === probe('--k-warn') ? 'warn' : 'plain', ignored: e.closest('[data-k-ignore]') !== null, inUi: e.closest('.k-ui') !== null }
  })
const visible = (page: Page) => chip(page).evaluate((e) => getComputedStyle(e).visibility !== 'hidden' && Number(getComputedStyle(e).opacity) > 0.5)

test('C blends the clock in with the wall clock and the full talk time, and out again', async () => {
  const page = await open()
  expect(await chip(page).count()).toBe(0)
  await page.keyboard.press('c')
  await expect.poll(() => visible(page), { timeout: 5000 }).toBe(true)
  expect(await look(page)).toEqual({ text: '2:32 PM · 1:00 left', tone: 'plain', ignored: true, inUi: true })
  await page.clock.runFor(20_000) // the talk has not started: still on the first step
  expect((await look(page)).text).toBe('2:32 PM · 1:00 left')
  await page.keyboard.press('c')
  await expect.poll(() => visible(page), { timeout: 5000 }).toBe(false)
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(0) // C is no step
  await page.close()
})

test('talk time starts at the first step: time left turns warn near the end, then counts over in bad', async () => {
  const page = await open()
  await page.keyboard.press('c')
  await page.keyboard.press('ArrowRight')
  await page.clock.runFor(30_000)
  await expect.poll(() => look(page), { timeout: 5000 }).toMatchObject({ text: '2:32 PM · 0:30 left', tone: 'plain' })
  await page.clock.runFor(20_000) // the last fifth of a talk shorter than 25 minutes warns
  await expect.poll(() => look(page), { timeout: 5000 }).toMatchObject({ text: '2:32 PM · 0:10 left', tone: 'warn' })
  await page.clock.runFor(40_000)
  await expect.poll(() => look(page), { timeout: 5000 }).toMatchObject({ text: '2:33 PM · +0:30 over', tone: 'bad' })
  await page.close()
})

test('C in the speaker view toggles the clock on the audience screen', async () => {
  const context = await browser.newContext()
  const deck = await open(context as unknown as Browser)
  const [speaker] = await Promise.all([context.waitForEvent('page'), deck.keyboard.press('n')])
  await speaker.waitForSelector('.k-sp-time', { timeout: 30_000 })
  await speaker.keyboard.press('c')
  await expect.poll(() => chip(deck).count(), { timeout: 5000 }).toBe(1)
  await expect.poll(() => visible(deck), { timeout: 5000 }).toBe(true)
  await speaker.getByRole('button', { name: 'Clock', exact: true }).click()
  await expect.poll(() => visible(deck), { timeout: 5000 }).toBe(false)
  await context.close()
})
