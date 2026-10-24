import { chromium, type Browser } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'

let browser: Browser
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The speaker view at a window size: the main deck and the speaker page in one context, so they share the channel.
async function speakerAt(width: number, height: number) {
  const context = await browser.newContext({ viewport: { width, height } })
  const main = await context.newPage()
  await main.goto(`${inject('BASE_URL')}/?fixture=two-scenes#/a/first/2`)
  await main.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const speaker = await context.newPage()
  await speaker.goto(`${inject('BASE_URL')}/?fixture=two-scenes&speaker=1`)
  await expect.poll(() => speaker.locator('.k-sp-text').textContent()).toBe('Step 2.')
  const r = await speaker.evaluate(() => {
    const px = (sel: string) => parseFloat(getComputedStyle(document.querySelector(sel)!).fontSize)
    const next = getComputedStyle(document.querySelector('.k-sp-next')!)
    return {
      text: px('.k-sp-text'),
      scene: px('.k-sp-scene'),
      notes: px('.k-sp-notes'),
      nextSize: px('.k-sp-next'),
      clamp: next.webkitLineClamp,
      progress: document.querySelector('.k-sp-progress')?.textContent,
    }
  })
  await context.close()
  return r
}

test('the current step is the largest text, the next one is clamped to 2 lines, and N / M shows the place', async () => {
  const r = await speakerAt(1280, 800)
  expect(r.text).toBeGreaterThan(r.scene)
  expect(r.text).toBeGreaterThan(r.nextSize)
  expect(r.notes).toBeGreaterThanOrEqual(28)
  expect(r.clamp).toBe('2')
  expect(r.progress).toBe('2 / 7')
})

test('the type scales with the window', async () => {
  const [small, large] = [await speakerAt(1024, 700), await speakerAt(1920, 1080)]
  expect(large.text).toBeGreaterThan(small.text)
  expect(large.notes).toBeGreaterThan(small.notes)
})
