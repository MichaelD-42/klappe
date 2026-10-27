import { chromium } from '@playwright/test'
import { expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

// The fixture's one over-long message label is its only problem.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and sequence text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-sequence`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['sections/10-a/30-long/scene.ts step 1: sequence: label of message 0 too long'])
  })

// Each part shows with the first row it covers: a bar on its lifeline over its rows, a note over its actor, a
// frame round its rows across the diagram with its kind and guard in the corner, and the else line at its row.
test('activation bars, a note row and alt and loop frames show with their rows', async () => {
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    const at = async (step: number) => {
      await page.goto(`${inject('BASE_URL')}/?fixture=fx-sequence#/a/uml/${step}`)
      await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
      await settle(page)
      return page.evaluate(() => {
        // The scene's SVG group and HTML box both carry data-scene: search under either.
        const root = { querySelector: (q: string) => document.querySelector(`[data-scene="uml"] ${q}`), querySelectorAll: (q: string) => document.querySelectorAll(`[data-scene="uml"] ${q}`) }
        const shows = (e: Element) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true })
        const box = (e: Element) => e.getBoundingClientRect()
        const head = (id: string) => box(root.querySelector(`[data-k-seq-actor="${id}"]`)!)
        const mid = (r: DOMRect) => r.left + r.width / 2
        const bars = [...root.querySelectorAll('[data-k-seq-activation]')].filter(shows)
        const note = root.querySelector('[data-k-seq-note]')!
        const frames = [...root.querySelectorAll('[data-k-seq-frame]')].filter(shows)
        return {
          bars: bars.map((b) => b.getAttribute('data-k-seq-activation')),
          barsOnLifeline: bars.every((b) => Math.abs(mid(box(b)) - mid(head(b.getAttribute('data-k-seq-activation')!))) < 2),
          note: shows(note) ? note.textContent : null,
          noteOverApi: Math.abs(mid(box(note)) - mid(head('a'))) < 2,
          frames: frames.map((f) => f.textContent?.replace(/\s+/g, ' ').trim()),
          elseLine: [...root.querySelectorAll('[data-k-seq-else]')].filter(shows).map((e) => e.textContent),
        }
      })
    }
    expect(await at(2)).toMatchObject({ bars: ['a'], barsOnLifeline: true, note: null, frames: [], elseLine: [] })
    expect(await at(3)).toMatchObject({ note: 'Checks the body', noteOverApi: true })
    expect(await at(4)).toMatchObject({ bars: ['a', 'w'], barsOnLifeline: true, frames: ['alt [valid]'], elseLine: [] })
    expect(await at(5)).toMatchObject({ frames: ['alt [valid]', 'loop [until it succeeds]'] })
    expect(await at(6)).toMatchObject({ elseLine: ['[invalid]'] })
  } finally {
    await browser.close()
  }
}, 90_000)
