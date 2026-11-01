import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'

let browser: Browser
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The ink layer's laser dot (its centre in frame px, or null when hidden) and its pen strokes (point counts).
const ink = (page: Page) =>
  page.evaluate(() => {
    const layer = document.querySelector('.k-ink')!
    const dot = layer.querySelector('circle')!
    return {
      ignored: layer.hasAttribute('data-k-ignore'),
      dot: getComputedStyle(dot).visibility === 'visible' ? [Math.round(+dot.getAttribute('cx')!), Math.round(+dot.getAttribute('cy')!)] : null,
      strokes: [...layer.querySelectorAll('polyline')].map((p) => p.points.length),
    }
  })

async function open(page: Page) {
  await page.goto(`${inject('BASE_URL')}/?fixture=two-scenes&instant=1#/a/first/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
}

// The viewport is the frame's size, so a mouse position is a frame px.
test('L shows a laser dot that follows the mouse, D draws a stroke that fades; a click draws, never advances; the next step clears it', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await open(page)
  await page.mouse.move(400, 300)
  expect((await ink(page)).dot).toBeNull()
  await page.keyboard.press('l')
  await page.mouse.move(500, 320)
  expect(await ink(page)).toMatchObject({ ignored: true, dot: [500, 320] })
  await page.mouse.click(500, 320)
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(0)
  await page.keyboard.press('l')
  expect((await ink(page)).dot).toBeNull()

  await page.keyboard.press('d')
  await page.mouse.move(100, 100)
  await page.mouse.down()
  for (const x of [150, 200, 250]) await page.mouse.move(x, 120)
  await page.mouse.up()
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(0)
  expect((await ink(page)).strokes).toEqual([4])
  await page.clock.runFor(1000)
  expect((await ink(page)).strokes).toEqual([4]) // it holds a while, then fades
  await page.clock.runFor(5000)
  expect((await ink(page)).strokes).toEqual([])

  await page.mouse.move(100, 400)
  await page.mouse.down()
  await page.mouse.move(300, 400)
  await page.mouse.up()
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction(() => window.klappe.stepper.index === 1)
  expect((await ink(page)).strokes).toEqual([])
  await page.close()
})

test('the speaker view drives the ink from its pad: L and the pad move the laser dot on the stage', async () => {
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } })
  const main = await context.newPage()
  await open(main)
  const speaker = await context.newPage()
  await speaker.goto(`${inject('BASE_URL')}/?fixture=two-scenes&speaker=1`)
  await speaker.waitForFunction(() => window.klappe?.speakerView, undefined, { timeout: 30_000 })
  await speaker.keyboard.press('l')
  const pad = (await speaker.locator('.k-sp-pad').boundingBox())!
  await speaker.mouse.move(pad.x + pad.width / 4, pad.y + pad.height / 2)
  await expect.poll(async () => (await ink(main)).dot).toEqual([480, 540])
  await speaker.keyboard.press('d')
  await speaker.mouse.move(pad.x + 10, pad.y + 10)
  await speaker.mouse.down()
  await speaker.mouse.move(pad.x + 60, pad.y + 10)
  await speaker.mouse.up()
  await expect.poll(async () => (await ink(main)).strokes).toEqual([2])
  await expect.poll(async () => (await ink(main)).dot).toBeNull()
  await context.close()
})
