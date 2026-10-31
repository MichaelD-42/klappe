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
  await speaker.waitForFunction(() => window.klappe?.speakerView, undefined, { timeout: 30_000 }) // the deck loads after the load event
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

// The main deck at a deep link and the speaker view it opens with N, as a presenter does: the speaker reads
// effect notes from its opener.
async function pair(fixture: string, hash: string) {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const main = await context.newPage()
  await main.goto(`${inject('BASE_URL')}/?fixture=${fixture}${hash}`)
  await main.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const [speaker] = await Promise.all([context.waitForEvent('page'), main.keyboard.press('n')])
  await expect.poll(() => speaker.locator('.k-sp-progress').textContent(), { timeout: 30_000 }).toMatch(/^\d+ \//)
  const notes = () => speaker.locator('.k-sp-notes').textContent()
  return { context, main, speaker, notes }
}

test('Home and End in the speaker view move the deck to its first and last step', async () => {
  const { context, main, speaker } = await pair('two-scenes', '#/a/first/2')
  const index = () => main.evaluate(() => window.klappe.stepper.index as number)
  await speaker.keyboard.press('End')
  await expect.poll(index, { timeout: 10_000 }).toBe(6)
  await speaker.keyboard.press('Home')
  await expect.poll(index, { timeout: 10_000 }).toBe(0)
  await context.close()
})

// Effects put notes for the presenter on the stage (a stat's source); the sticky notes' own ids are not notes.
test('the speaker notes show an effect\'s note, and not the ids of sticky notes', async () => {
  let p = await pair('fx-stats', '#/a/all/1')
  await expect.poll(p.notes, { timeout: 10_000 }).toContain('klappe demo sample')
  await p.context.close()
  p = await pair('fx-notes-cards', '#/a/notes/2')
  expect(await p.notes()).toBe('')
  await p.context.close()
})

// Rehearsal: P starts a run, the time per scene is stored under the deck's key, stopping keeps it, Reset clears it.
test('rehearsal records the seconds per scene in localStorage and shows them against the plan', async () => {
  const { context, main, speaker } = await pair('two-scenes', '#/a/first/1')
  const stored = () => speaker.evaluate(() => {
    const k = Object.keys(localStorage).find((x) => x.endsWith(':rehearsal'))
    return k ? JSON.parse(localStorage.getItem(k)!) : null
  })
  await speaker.keyboard.press('p')
  await speaker.waitForTimeout(1200)
  await speaker.keyboard.press('End')
  await expect.poll(() => main.evaluate(() => window.klappe.stepper.index as number), { timeout: 10_000 }).toBe(6)
  await speaker.waitForTimeout(1200)
  await speaker.keyboard.press('p')
  const run = await stored()
  expect(run['a/first']).toBeGreaterThanOrEqual(1)
  expect(run['a/second']).toBeGreaterThanOrEqual(1)
  expect(await speaker.locator('.k-sp-plan-row').count()).toBe(2)
  expect(await speaker.locator('.k-sp-plan-row').first().textContent()).toMatch(/\d\d:\d\d \/ 01:15/) // 5 steps at 15 s
  await speaker.getByRole('button', { name: 'Reset times' }).click()
  expect(await stored()).toBeNull()
  expect(await speaker.locator('.k-sp-plan-row').count()).toBe(0)
  await context.close()
})
