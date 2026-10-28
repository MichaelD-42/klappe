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
// Long waits: 2 s of frames for any move to finish, a jump over the count (the timer reads performance.now),
// then 0.5 s of frames to draw it. Stepping 60 s frame by frame took most of this file's time.
const runFor = async (page: Page, ms: number) => {
  if (ms <= 2500) return page.clock.runFor(ms)
  await page.clock.runFor(2000)
  await page.clock.fastForward(ms - 2500)
  await page.clock.runFor(500)
}
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
  await runFor(page, 61_000 + 40) // plus the frame the flight ends in and the frame that draws
  expect(await ring(page)).toEqual({ text: '8:59', hint: '' })
  await page.close()
})

test('the next step in the scene keeps it running', async () => {
  const page = await open('', '#/a/intro/1')
  await page.evaluate(() => void window.klappe.stepper.next())
  await runFor(page, 1600 + 10_500) // the camera flight, then the count
  await page.evaluate(() => void window.klappe.stepper.next())
  await runFor(page, 10_000)
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
  await runFor(page, 1600 + 30_500)
  expect((await ring(page)).text).toBe('9:30')
  await move(page, await index(page, 'bar'), 'play')
  // No frame loop is left running while the scene is away: the hidden timer does not move.
  await runFor(page, 10_000)
  expect(await ring(page)).toEqual({ text: '10:00', hint: 'Press T to start' })
  await move(page, await index(page, 'ring'), 'cut')
  await runFor(page, 5000)
  expect(await ring(page)).toEqual({ text: '10:00', hint: 'Press T to start' })
  await page.close()
})

test('a deep link shows it paused with the hint; t starts it, t again pauses it, a click resumes', async () => {
  const page = await open('', '#/a/ring/1')
  expect(await ring(page)).toEqual({ text: '10:00', hint: 'Press T to start' })
  await runFor(page, 5000)
  expect((await ring(page)).text).toBe('10:00')
  await page.keyboard.press('t')
  await page.clock.runFor(1000 + 20)
  expect(await ring(page)).toEqual({ text: '9:59', hint: '' })
  await page.keyboard.press('t')
  await runFor(page, 5000)
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

// The speaker view's Timer button: main and speaker as two pages of one context, on the real clock.
// It is disabled on a scene without a timer, where it would do nothing.
test('the speaker view timer button starts the timer, and is disabled on a scene without one', async () => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const main = await context.newPage()
  await main.goto(`${inject('BASE_URL')}/?fixture=fx-timer#/a/intro/1`)
  await main.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const speaker = await context.newPage()
  await speaker.goto(`${inject('BASE_URL')}/?fixture=fx-timer&speaker=1`)
  const button = speaker.getByRole('button', { name: 'Timer', exact: true })
  await expect.poll(() => speaker.locator('.k-sp-scene').textContent()).toBe('Intro')
  expect(await button.isDisabled()).toBe(true)
  await speaker.getByRole('button', { name: 'Next', exact: true }).click()
  await expect.poll(() => speaker.locator('.k-sp-scene').textContent()).toBe('Ring')
  expect(await button.isDisabled()).toBe(false)
  await expect.poll(async () => (await ring(main)).hint, { timeout: 5000 }).toBe('') // the play started it
  await button.click() // pauses
  const paused = (await ring(main)).text
  await new Promise((r) => setTimeout(r, 2000))
  expect((await ring(main)).text).toBe(paused)
  await button.click() // resumes
  await expect.poll(async () => (await ring(main)).text, { timeout: 5000 }).not.toBe(paused)
  await context.close()
}, 60_000)

test('until counts to the time of day by itself, from a deep link; t does not pause it; a past time is up', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  // Paused before load: a flowing clock would add the page-load time to the count.
  await page.clock.install({ time: new Date(2026, 9, 21, 10, 5, 29) })
  await page.clock.pauseAt(new Date(2026, 9, 21, 10, 5, 30))
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

test("cycle: after Time's up, one t starts the next run at full time", async () => {
  const page = await open('', '#/a/cycle/1')
  const read = () =>
    page.evaluate(() => {
      const q = (s: string) => document.querySelector(`[data-scene$="cycle"] [data-k-timer-${s}]`)!.textContent
      return { text: q('text'), hint: q('hint') }
    })
  await page.keyboard.press('t')
  await page.clock.runFor(3000 + 40)
  expect(await read()).toEqual({ text: '0:00', hint: "Time's up" })
  await page.keyboard.press('t')
  await page.clock.runFor(1000 + 20)
  expect(await read()).toEqual({ text: '0:02', hint: '' })
  await page.close()
})

// Runs in the page with a bare ctx: show(tl, "<") places the fade with the tween before it, and the timer
// starts when a played step spans that place, not the end of the timeline.
test('timer show takes a position; the start follows it', async () => {
  const page = await open('', '#/a/intro/1')
  // A string, so neither vitest nor tsc rewrites the import: the page loads the module from Vite.
  await page.evaluate("import('/src/fx/timer.ts').then((m) => { window.__timer = m.timer })")
  const r = await page.evaluate(() => {
    const html = document.body.appendChild(document.createElement('div'))
    const make = () => {
      let listener: any
      const ctx = { html, scene: 's', deck: { lang: 'en', intensity: 'calm' }, problem: () => {}, onStep: (fn: any) => (listener = fn) }
      const h = (window as any).__timer(ctx, { minutes: 1, style: 'text', x: 0, y: 0, size: 300 })
      const hint = html.lastElementChild!.querySelector('[data-k-timer-hint]')!
      return { h, step: (e: any) => listener(e), hint: () => hint.textContent }
    }
    const TL = window.klappe.canvases[0].tl.constructor as any
    const withAt = make()
    const tl = new TL({ paused: true })
    tl.to({}, { duration: 2 })
    withAt.h.show(tl, '<')
    withAt.step({ play: true, span: [0, 2], scene: 's' })
    const appended = make()
    const tl2 = new TL({ paused: true })
    tl2.to({}, { duration: 2 })
    appended.h.show(tl2)
    const out = {
      at: tl.getChildren()[1].startTime(),
      startedWithAt: withAt.hint(),
      end: tl2.getChildren()[1].startTime(),
    }
    html.remove()
    return out
  })
  expect(r).toEqual({ at: 0, startedWithAt: '', end: 2 })
  await page.close()
})

// hide: after its step the timer is gone and stopped, as if its scene were left; t no longer reaches it.
test('hide fades the timer out and stops it; t does nothing after; the label is styleable', async () => {
  const page = await open('', '#/a/cycle/1')
  const read = () =>
    page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('[data-scene$="hide"] [data-k-timer]')!
      return { text: root.querySelector('[data-k-timer-text]')!.textContent, visible: getComputedStyle(root).visibility, label: root.querySelector('[data-k-timer-label]')?.textContent }
    })
  await page.evaluate(() => void window.klappe.stepper.next())
  await runFor(page, 1600 + 20_500)
  expect(await read()).toEqual({ text: '9:40', visible: 'visible', label: 'Pairs' })
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(1000)
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(2000)
  expect(await read()).toMatchObject({ text: '10:00', visible: 'hidden' })
  await page.keyboard.press('t')
  await runFor(page, 5000)
  expect(await read()).toMatchObject({ text: '10:00', visible: 'hidden' })
  await page.close()
})
