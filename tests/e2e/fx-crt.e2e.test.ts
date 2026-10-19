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
    expect(r.steps).toBe(13)
    expect(r.ok).toBe(true)
  })

// Review focus 1: a deep link to the end of a typing step shows the whole line, as play does.
test('a deep link to a typing step shows its line fully typed', async () => {
  const page = await open('#/a/green/4')
  const lines = await page.evaluate(() => [...document.querySelectorAll('[data-k-text]')].map((e) => e.textContent))
  expect(lines.slice(0, 4)).toEqual(['DEMO-OS v1.0  (c) 1986', '', 'MEMORY TEST: 640K OK', ''])
  await page.close()
})

// Review focus 4: forward plays the CRT transition; back cuts with nothing left over,
// both after the transition ends and when back interrupts it.
for (const interrupted of [false, true])
  test(`back across a CRT transition cuts cleanly${interrupted ? ' when it interrupts the transition' : ''}`, async () => {
    const page = await open('#/a/green/6')
    const r = await page.evaluate(async (interrupted) => {
      const k = window.klappe
      const kinds: string[] = []
      k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
      const worlds = k.canvases[0].el.parentElement as HTMLElement
      const stage = worlds.parentElement as HTMLElement
      const forward = k.stepper.next()
      if (!interrupted) await forward
      await k.stepper.prev()
      await forward
      return {
        kinds,
        index: k.stepper.index,
        shown: k.canvases.map((c: { el: HTMLElement }) => getComputedStyle(c.el).visibility),
        worlds: worlds.getAttribute('style') ?? '',
        stageBg: stage.style.backgroundColor,
        stageImage: stage.style.backgroundImage,
      }
    }, interrupted)
    expect(r.kinds).toEqual(['crt', 'cut'])
    expect(r.index).toBe(5)
    expect(r.shown).toEqual(['visible', 'hidden', 'hidden'])
    expect(r.worlds).toBe('')
    expect(r.stageBg).toBe('')
    expect(r.stageImage).toBe('')
    await page.close()
  })

// Sixteen lines do not fit at 46 px: the font shrinks, every line shows, and the text stays on the screen.
test('long boot text shrinks to fit the screen', async () => {
  const page = await open('#/b/long/3')
  const r = await page.evaluate(() => {
    const term = document.querySelector('[data-scene="long"] .k-crt-term') as HTMLElement
    const screen = term.parentElement!.getBoundingClientRect()
    const rows = [...term.children].map((e) => e.getBoundingClientRect())
    return {
      size: parseFloat(getComputedStyle(term).fontSize),
      typed: [...term.querySelectorAll('[data-k-text]')].filter((e) => e.textContent!.endsWith('OK')).length,
      inside: rows.every((b) => b.bottom <= screen.bottom && b.right <= screen.right),
    }
  })
  expect(r.size).toBeLessThan(46)
  expect(r.size).toBeGreaterThanOrEqual(20)
  expect(r.typed).toBe(16)
  expect(r.inside).toBe(true)
  await page.close()
})
