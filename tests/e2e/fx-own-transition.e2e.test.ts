import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(hash: string, query = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-own-transition${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const reduced of [false, true])
  test(`walk passes across an own transition${reduced ? ', reduced motion' : ''}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-own-transition${reduced ? '&reducedmotion=1' : ''}`, { w: 1366, h: 768 })
    // Section c's function has no reveal: a problem and a logged fallback when it plays, neither when reduced motion plays a fade instead.
    expect(r.errors.length > 0).toBe(!reduced)
    expect(r.problems).toEqual(reduced ? [] : [expect.stringContaining('section c')])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
  })

// Steps forward, freezes the transition half way, reads the new canvas, then lets it end.
const across = (page: Page) =>
  page.evaluate(async () => {
    const k = window.klappe
    const kinds: string[] = []
    k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
    const to = k.canvases[1].el as HTMLElement
    const forward = k.stepper.next()
    await new Promise((r) => requestAnimationFrame(r))
    const tl = k.stepper.running[0]
    tl.pause().progress(0.5)
    const mid = { duration: tl.duration(), reveal: tl.labels.reveal, opacity: Number(getComputedStyle(to).opacity) }
    tl.play()
    await forward
    return { kinds, mid, step: k.stepper.index }
  })

test('an own transition runs its tweens with transitionOptions and starts the step at reveal', async () => {
  const page = await open('#/a/one/1')
  const r = await across(page)
  expect(r.kinds).toEqual(['custom'])
  expect(r.mid.duration).toBeCloseTo(0.5)
  expect(r.mid.reveal).toBe(0)
  expect(r.mid.opacity).toBeGreaterThan(0)
  expect(r.mid.opacity).toBeLessThan(1)
  await page.close()
})

test('an own transition cuts on a jump and with ?instant=1', async () => {
  for (const [hash, query] of [['#/b/wiped/1', ''], ['#/a/one/1', '&instant=1']]) {
    const page = await open(hash, query)
    const kinds = await page.evaluate(async () => {
      const k = window.klappe
      const kinds: string[] = []
      k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
      location.hash.startsWith('#/b') ? await k.stepper.prev() : await k.stepper.next()
      return kinds
    })
    expect(kinds).toEqual(['cut'])
    await page.close()
  }
})

test('an own transition without a reveal label is a problem naming the section and plays a fade', async () => {
  const page = await open('#/b/wiped/1')
  const r = await page.evaluate(async () => {
    const k = window.klappe
    const errors: string[] = []
    const log = console.error
    console.error = (m: string) => errors.push(m)
    const kinds: string[] = []
    k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
    await k.stepper.next()
    console.error = log
    return { kinds, errors, problems: k.problems }
  })
  expect(r.kinds).toEqual(['fade'])
  expect(r.problems).toEqual([expect.stringContaining('section c')])
  await page.close()
})

// The transition's layer is one node, reused; seeking the timeline to the middle, to 0 and to the middle again gives the same pose.
test('an own transition seeks like it plays and reuses its layer', async () => {
  const page = await open('#/a/one/1')
  const r = await page.evaluate(async () => {
    const k = window.klappe
    const pose = () => {
      const bar = document.querySelector('[data-k-wipe]') as HTMLElement
      return [getComputedStyle(bar).opacity, bar.style.transform, getComputedStyle(k.canvases[1].el as HTMLElement).opacity].join('|')
    }
    const forward = k.stepper.next()
    await new Promise((r) => requestAnimationFrame(r))
    const tl = k.stepper.running[0]
    tl.pause().progress(0.5)
    const first = pose()
    tl.progress(0)
    const start = pose()
    tl.progress(0.5)
    const again = pose()
    tl.play()
    await forward
    const ended = pose()
    await k.stepper.prev()
    await k.stepper.next()
    return { first, start, again, ended, bars: document.querySelectorAll('[data-k-wipe]').length }
  })
  expect(r.again).toBe(r.first)
  expect(r.start).not.toBe(r.first)
  expect(r.first.startsWith('1|')).toBe(true)
  expect(r.ended.startsWith('0|')).toBe(true)
  expect(r.bars).toBe(1)
  await page.close()
})
