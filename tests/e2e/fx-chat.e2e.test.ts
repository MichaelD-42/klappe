import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const [vp, flags] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${flags}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-chat${flags}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

const ANSWER = "Yes. Run npm ci once, then npm test. The first run downloads the browsers, so it takes a few minutes."

const open = async (hash: string, flags = '') => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-chat${flags}#/a/${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}
// Each message row of a scene: its streamed text, whether it shows, whether its typing dots show, and its
// bubble's top and bottom inside the panel (scene px at 1366 times 0.71).
const read = (page: import('@playwright/test').Page, scene: string) =>
  page.evaluate((scene) => {
    const panel = document.querySelector<HTMLElement>(`[data-scene="${scene}"] .k-chat`)!
    const box = panel.getBoundingClientRect()
    const vis = (e: Element | null) => !!e?.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    return [...panel.querySelectorAll<HTMLElement>('.k-chat-row')].map((row) => {
      const b = row.querySelector('.k-chat-bubble')!.getBoundingClientRect()
      return {
        text: row.querySelector('.k-chat-live')!.textContent,
        user: row.classList.contains('k-chat-user'),
        shown: vis(row) && vis(row.querySelector('.k-chat-bubble')),
        dots: vis(row.querySelector('.k-chat-dots')),
        inside: b.top >= box.top - 0.5 && b.bottom <= box.bottom + 0.5,
      }
    })
  }, scene)

// A deep link onto the last step: every message complete, no dots, the thread scrolled so the last one shows.
// The fixture panel is 520 high: messages 4 and 5 push messages 1 and 2 out whole.
test('a deep link onto the last message shows every message whole; the first ones have scrolled out', async () => {
  const page = await open('thread/5')
  const r = await read(page, 'thread')
  expect(r.map((m) => m.text)).toEqual([
    'Can the build run on my laptop?',
    ANSWER,
    'I can pair with you on it after lunch.',
    'Thanks, both of you!',
    'Any time. Tell me if a test fails and paste its output here.',
  ])
  expect(r.map((m) => m.user)).toEqual([true, false, false, true, false])
  expect(r.map((m) => m.shown)).toEqual([false, false, true, true, true]) // scrolled out whole and faded
  expect(r.filter((m) => m.shown).every((m) => m.inside)).toBe(true)
  expect(r.every((m) => !m.dots)).toBe(true)
  expect(r[0].inside).toBe(false)
  expect(r[4].inside).toBe(true)
  expect(await page.locator('[data-scene="thread"] .k-chat-name').allTextContents()).toEqual(['Ana'])
  await page.close()
})

// On a fake clock (as in fx-reveal): the dots hop first, then the answer streams in as a prefix of its text.
test("mid-step, the dots show first, then the answer streams in as a prefix of its text", async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.clock.install()
  await page.goto(`${inject("BASE_URL")}/?fixture=fx-chat#/a/thread/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(1500)
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(500) // the dots hop until 1.24 s
  const dots = (await read(page, "thread"))[1]
  expect(dots.dots).toBe(true)
  expect(dots.shown).toBe(false)
  await page.clock.runFor(2000) // inside the 2 s stream of 102 characters (the step starts a little after the press)
  const mid = (await read(page, "thread"))[1]
  expect(mid.dots).toBe(false)
  expect(mid.shown).toBe(true)
  expect(mid.text!.length).toBeGreaterThan(0)
  expect(mid.text!.length).toBeLessThan(ANSWER.length)
  expect(ANSWER.startsWith(mid.text!)).toBe(true)
  await page.close()
})

// Adders made out of step order in build still show the messages in step order.
test('next() adders made in reverse order show the messages in step order', async () => {
  const page = await open('order/2')
  expect((await read(page, 'order')).map((m) => m.shown)).toEqual([true, true, false])
  await page.close()
})

// Reduced motion: no typing dots; the answer is whole as soon as it shows.
test('reduced motion: no dots, the message lands whole', async () => {
  const page = await open('thread/1', '&reducedmotion=1')
  expect(await page.locator('[data-scene="thread"] .k-chat-dots').count()).toBe(0)
  await page.evaluate(() => void window.klappe.stepper.next())
  await settle(page)
  const r = (await read(page, 'thread'))[1]
  expect(r.text).toBe(ANSWER)
  expect(r.dots).toBe(false)
  await page.close()
})
