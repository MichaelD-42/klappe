import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-crt${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk passes on the CRT fixture at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-crt`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBe(10)
    expect(r.ok).toBe(true)
  })

// Review focus 1: a deep link to the end of a typing step shows the whole line, as play does.
test('a deep link to a typing step shows its line fully typed', async () => {
  const page = await open('#/a/green/4')
  const lines = await page.evaluate(() => [...document.querySelectorAll('[data-k-text]')].map((e) => e.textContent))
  expect(lines.slice(0, 4)).toEqual(['DEMO-OS v1.0  (c) 1986', '', 'MEMORY TEST: 640K OK', ''])
  await page.close()
})

// Review focus 4: forward plays the CRT transition; back cuts with nothing left over.
test('back across a CRT transition cuts cleanly', async () => {
  const page = await open('#/a/green/6')
  const r = await page.evaluate(async () => {
    const k = window.klappe
    const kinds: string[] = []
    k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
    await k.stepper.next()
    const worlds = k.canvases[0].el.parentElement as HTMLElement
    const stage = worlds.parentElement as HTMLElement
    await k.stepper.goto(k.stepper.index - 1, 'cut')
    return {
      kinds,
      shown: k.canvases.map((c: { el: HTMLElement }) => getComputedStyle(c.el).visibility),
      worlds: worlds.getAttribute('style') ?? '',
      stageBg: stage.style.backgroundColor,
    }
  })
  expect(r.kinds).toEqual(['crt', 'cut'])
  expect(r.shown).toEqual(['visible', 'hidden', 'hidden'])
  expect(r.worlds).toBe('')
  expect(r.stageBg).toBe('')
  await page.close()
})
