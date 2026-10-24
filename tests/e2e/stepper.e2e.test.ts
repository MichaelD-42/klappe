import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'

// Review focus 2: keys pressed while a step plays. Runs on an in-code fixture deck, not the user's deck.
let browser: Browser
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=two-scenes`)
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  return page
}

const shown = (page: Page, n: number) =>
  page.evaluate((n) => {
    const s = getComputedStyle(document.querySelector(`[data-scene="first"] [data-step="${n}"]`)!)
    return s.visibility === 'visible' && s.opacity === '1'
  }, n)

test('a key during a play finishes it, then advances once', async () => {
  const page = await open()
  const ms = await page.evaluate(async () => {
    const s = window.klappe.stepper
    s.next()
    await new Promise((r) => setTimeout(r, 150)) // mid-play
    const t0 = performance.now()
    await s.next()
    return performance.now() - t0
  })
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(2)
  expect(await shown(page, 3)).toBe(true)
  expect(await shown(page, 4)).toBe(false)
  expect(ms).toBeLessThan(1000) // one step (0.6 s), not the rest of the first plus a second
  await page.close()
})

test('a same-tick burst of 3 presses lands exactly 3 steps on', async () => {
  const page = await open()
  const ms = await page.evaluate(async () => {
    const s = window.klappe.stepper
    const t0 = performance.now()
    await Promise.all([s.next(), s.next(), s.next()])
    return performance.now() - t0
  })
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(3)
  expect(await shown(page, 4)).toBe(true)
  expect(ms).toBeLessThan(1200) // queued moves are fast-forwarded; only the last one plays
  await page.close()
})

// The speaker view, browser history and autoplay move the stage without a key: an open panel must not stay over it.
test('a step from outside the panels closes the overview and the section list', async () => {
  const page = await open()
  const after = await page.evaluate(async () => {
    const { stepper, overview, selector } = window.klappe
    const out: boolean[] = []
    for (const p of [overview, selector]) {
      p.open()
      await stepper.next() // what a speaker "next" command and autoplay call
      out.push(p.isOpen)
    }
    selector.open()
    history.back() // the router's popstate jump
    await new Promise((r) => setTimeout(r, 500))
    out.push(selector.isOpen)
    return out
  })
  expect(after).toEqual([false, false, false])
  await page.close()
})

// Autoplay switched on mid-play holds after the play ends, and does not cut the playing step short.
test('autoplay started mid-play holds from the end of the play', async () => {
  const page = await open()
  const ms = await page.evaluate(async () => {
    const { stepper, autoplay } = window.klappe
    const t0 = performance.now()
    stepper.next() // step 2 plays for 0.6 s
    await new Promise((r) => setTimeout(r, 150))
    autoplay.start()
    await new Promise<void>((r) => stepper.on('step', (a: any) => a.index === 2 && r()))
    autoplay.stop()
    return performance.now() - t0
  })
  expect(ms).toBeGreaterThan(600 + 2500 - 100) // the play, then the full hold
  await page.close()
}, 30_000)

// A scene's title fades in over the camera's last 0.4 s, not after it lands: the frame is never empty for 0.6 s.
test('the title starts to fade in 0.4 s before the camera lands', async () => {
  const page = await open()
  const r = await page.evaluate(() => {
    const tl = window.klappe.canvases[0].tl
    const title = document.querySelector('[data-scene="second"] h2')!
    const world = window.klappe.canvases[0].world
    const tweens = tl.getChildren(false, true, false) as gsap.core.Tween[]
    const fade = tweens.find((t) => t.targets()[0] === title)!
    // The flight to this scene: the last camera tween that starts before the title's fade.
    const cam = tweens.filter((t) => t.targets()[0] === world && t.startTime() <= fade.startTime()).at(-1)!
    return { lead: +(cam.endTime() - fade.startTime()).toFixed(3) }
  })
  expect(r.lead).toBe(0.4)
  await page.close()
})
