import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Browser
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// play() and pause() are recorded, never heard: "play hit" or "pause bed" by the file's base64 text.
async function open(query = ''): Promise<Page> {
  const page = await browser.newPage()
  await page.addInitScript(() => {
    const w = window as any
    w.sounds = []
    const name = (el: HTMLMediaElement) => atob(el.src.split(',')[1] ?? '')
    HTMLMediaElement.prototype.play = function () {
      w.sounds.push(`play ${name(this)}`)
      Object.defineProperty(this, 'paused', { value: false, configurable: true })
      return Promise.resolve()
    }
    HTMLMediaElement.prototype.pause = function () {
      if (!this.paused) w.sounds.push(`pause ${name(this)}`)
      Object.defineProperty(this, 'paused', { value: true, configurable: true })
    }
  })
  await page.goto(`${inject('BASE_URL')}/?fixture=sound&reducedmotion=0${query}#/intro/hello/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  return page
}
const sounds = (page: Page) => page.evaluate(() => (window as any).sounds as string[])
const step = async (page: Page, how: 'next' | 'prev') => {
  await page.evaluate((h) => window.klappe.stepper[h](), how)
  await page.evaluate(() => window.klappe.stepper.idle)
  await page.waitForTimeout(100)
}

test('a forward step into a section starts its music bed; the cue plays on its step; leaving the section stops the bed', async () => {
  const page = await open()
  expect(await sounds(page)).toEqual([])
  await step(page, 'next') // into section a: the bed
  expect(await sounds(page)).toEqual(['play bed'])
  await step(page, 'next') // the hit
  expect(await sounds(page)).toEqual(['play bed', 'play hit'])
  await step(page, 'next')
  await step(page, 'next') // into section b
  await expect.poll(() => sounds(page)).toEqual(['play bed', 'play hit', 'pause bed'])
  await page.close()
})

test('a seek, a jump and a step back stay silent', async () => {
  const page = await open()
  await page.evaluate(() => window.klappe.stepper.goto(2, 'cut')) // a jump to the hit's step, into the bed's section
  await step(page, 'prev')
  expect(await sounds(page)).toEqual([])
  await step(page, 'next') // a forward step onto the hit: the hit, and the bed of the section it plays in
  expect(await sounds(page)).toEqual(['play bed', 'play hit'])
  await page.close()
})

test('M mutes and unmutes; without sound: true in deck.md nothing plays', async () => {
  const page = await open()
  await step(page, 'next')
  await page.keyboard.press('m')
  expect(await sounds(page)).toEqual(['play bed', 'pause bed'])
  await step(page, 'next')
  expect(await sounds(page)).toEqual(['play bed', 'pause bed'])
  await page.keyboard.press('m')
  expect(await sounds(page)).toEqual(['play bed', 'pause bed', 'play bed']) // the bed goes on where it was
  await page.close()
  const off = await open('&off=1')
  await step(off, 'next')
  await step(off, 'next')
  expect(await sounds(off)).toEqual([])
  await off.close()
})

test('walk: play equals seek, and nothing plays in the self-test', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=sound`)
  expect(r.errors).toEqual([])
  expect(r.problems).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
}, 120_000)
