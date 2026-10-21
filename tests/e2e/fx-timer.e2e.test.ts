import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: the timer fixture walks clean at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-timer`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

// The timer counts wall-clock time: Playwright's fake clock drives performance.now and requestAnimationFrame
// (GSAP's ticker too), so every move below is followed by page.clock.runFor to let its play finish.
// The display updates once a frame (16 ms under the fake clock), so a read right after a whole second adds a frame.
let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(query: string, hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-timer${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(2000)
  return page
}
const ring = (page: Page) =>
  page.evaluate(() => {
    const q = (s: string) => document.querySelector(`[data-scene$="ring"] [data-k-timer-${s}]`)!.textContent
    return { text: q('text'), hint: q('hint') }
  })
const index = (page: Page, scene: string, step = 1) =>
  page.evaluate(([sc, n]) => window.klappe.steps.find((s: any) => s.scene.endsWith(sc) && s.step === n).index, [scene, step] as const)
// Starts a move without awaiting it: its play only finishes as the fake clock runs.
const move = async (page: Page, i: number, how: 'play' | 'cut') => {
  await page.evaluate(([i, how]) => void window.klappe.stepper.goto(i, how), [i, how] as const)
  await page.clock.runFor(1000)
}

test('play onto the timer starts it as it shows: 61 s later a 10 minute timer reads 8:59', async () => {
  const page = await open('', '#/a/intro/1')
  expect(await ring(page)).toEqual({ text: '10:00', hint: 'Press T to start' })
  await page.evaluate(() => void window.klappe.stepper.next())
  // The count waits out the 1.6 s camera flight, so the room first sees the full time.
  await page.clock.runFor(1600)
  expect(await ring(page)).toEqual({ text: '10:00', hint: '' })
  await page.clock.runFor(61_000 + 40) // plus the frame the flight ends in and the frame that draws
  expect(await ring(page)).toEqual({ text: '8:59', hint: '' })
  await page.close()
})

test('the next step in the scene keeps it running', async () => {
  const page = await open('', '#/a/intro/1')
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(1600 + 10_500) // the camera flight, then the count
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(10_000)
  expect(await page.evaluate(() => location.hash)).toBe('#/a/ring/2')
  expect(await ring(page)).toEqual({ text: '9:40', hint: '' })
  // Back onto the timer's step within the scene is a cut and leaves it running.
  await move(page, await index(page, 'ring'), 'cut')
  expect((await ring(page)).text).toBe('9:39')
  await page.close()
})

test('leaving the scene stops and resets it; a cut back finds it full and paused', async () => {
  const page = await open('', '#/a/intro/1')
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(1600 + 30_500)
  expect((await ring(page)).text).toBe('9:30')
  await move(page, await index(page, 'bar'), 'play')
  // No frame loop is left running while the scene is away: the hidden timer does not move.
  await page.clock.runFor(10_000)
  expect(await ring(page)).toEqual({ text: '10:00', hint: 'Press T to start' })
  await move(page, await index(page, 'ring'), 'cut')
  await page.clock.runFor(5000)
  expect(await ring(page)).toEqual({ text: '10:00', hint: 'Press T to start' })
  await page.close()
})

test('a deep link shows it paused with the hint; t starts it, t again pauses it, a click resumes', async () => {
  const page = await open('', '#/a/ring/1')
  expect(await ring(page)).toEqual({ text: '10:00', hint: 'Press T to start' })
  await page.clock.runFor(5000)
  expect((await ring(page)).text).toBe('10:00')
  await page.keyboard.press('t')
  await page.clock.runFor(1000 + 20)
  expect(await ring(page)).toEqual({ text: '9:59', hint: '' })
  await page.keyboard.press('t')
  await page.clock.runFor(5000)
  expect((await ring(page)).text).toBe('9:59')
  await page.click('[data-scene$="ring"] [data-k-timer]')
  await page.clock.runFor(2000)
  expect((await ring(page)).text).toBe('9:57')
  expect(await page.evaluate(() => location.hash)).toBe('#/a/ring/1') // the click did not step
  await page.close()
})

test('t on a scene with no timer does nothing and raises no error', async () => {
  const page = await open('', '#/a/intro/1')
  await page.keyboard.press('t')
  await page.clock.runFor(3000)
  expect(await ring(page)).toEqual({ text: '10:00', hint: 'Press T to start' })
  expect(await page.evaluate(() => location.hash)).toBe('#/a/intro/1')
  expect(await page.evaluate(() => window.klappe.errors)).toEqual([])
  await page.close()
})

test('autoplay over the timer step starts it on play', async () => {
  const page = await open('&autoplay=1', '#/a/intro/1')
  const at = await index(page, 'ring')
  for (let k = 0; k < 200 && (await page.evaluate(() => window.klappe.stepper.index)) < at; k++) await page.clock.runFor(100)
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(at)
  await page.clock.runFor(1600 + 1500) // the camera flight, then 1.5 s of count
  expect(await ring(page)).toEqual({ text: '9:59', hint: '' })
  expect(await page.evaluate(() => window.klappe.errors)).toEqual([])
  await page.close()
})

test('until counts to the time of day by itself, from a deep link; t does not pause it; a past time is up', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install({ time: new Date(2026, 9, 21, 10, 5, 30) })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-timer#/a/until/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-scene$="until"] [data-k-timer]')].map((t) => ({
        text: t.querySelector('[data-k-timer-text]')!.textContent,
        hint: t.querySelector('[data-k-timer-hint]')!.textContent,
      })),
    )
  await page.clock.runFor(2000 + 20)
  expect(await read()).toEqual([{ text: '14:28', hint: '' }, { text: '0:00', hint: "Time's up" }])
  await page.keyboard.press('t')
  await page.clock.runFor(3000)
  expect((await read())[0].text).toBe('14:25')
  await page.close()
})
