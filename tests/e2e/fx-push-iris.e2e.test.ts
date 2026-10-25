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
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-push-iris${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk passes across a push and an iris at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-push-iris`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.ok).toBe(true)
  })

// Steps forward onto the next canvas, freezes the transition at `at` of its length, reads both canvases, then lets it end.
async function across(page: Page, at: number) {
  return page.evaluate(async (at) => {
    const k = window.klappe
    const kinds: string[] = []
    k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
    const from = k.canvases[k.stepper.steps[k.stepper.index].canvas].el as HTMLElement
    const forward = k.stepper.next()
    await new Promise((r) => requestAnimationFrame(r))
    const tl = k.stepper.running[0]
    const to = k.canvases[k.stepper.steps[k.stepper.index].canvas].el as HTMLElement
    const reveal = tl.labels.reveal
    tl.pause().progress(at)
    const read = (e: HTMLElement) => ({ transform: e.style.transform, clip: e.style.clipPath, z: e.style.zIndex, shown: getComputedStyle(e).visibility })
    const mid = { from: read(from), to: read(to) }
    tl.play()
    await forward
    return { kinds, reveal, mid, end: { from: read(from), to: read(to) } }
  }, at)
}

const FRAME = 'polygon(0px 0px, 1920px 0px, 1920px 1080px, 0px 1080px)'

test('push moves both canvases up together inside the frame, then leaves no transform or clip', async () => {
  const page = await open('#/a/two/1')
  const r = await across(page, 0.5)
  expect(r.kinds).toEqual(['push'])
  expect(r.reveal).toBe(0) // the first step plays while the canvas moves in
  // Half way, with an ease that is symmetric: the old canvas is half a frame up, the new one half a frame below.
  expect(r.mid.from.transform).toBe('translate3d(0px, -540px, 0px)')
  expect(r.mid.to.transform).toBe('translate3d(0px, 540px, 0px)')
  expect([r.mid.from.clip, r.mid.to.clip]).toEqual([FRAME, FRAME])
  expect([r.mid.from.shown, r.mid.to.shown]).toEqual(['visible', 'visible'])
  expect(r.end.from).toEqual({ transform: '', clip: '', z: '', shown: 'hidden' })
  expect(r.end.to).toEqual({ transform: '', clip: '', z: '', shown: 'visible' })
  await page.close()
})

test('iris opens a circle from its origin and a matching hole in the old canvas, then clears both clips', async () => {
  const page = await open('#/b/pushed/1')
  const start = await across(page, 0)
  expect(start.kinds).toEqual(['iris'])
  expect(start.reveal).toBe(0)
  expect(start.mid.to.clip).toBe('circle(0px at 300px 200px)')
  // The old canvas gets the matching hole, so inside the circle only the new one shows.
  expect(start.mid.from.clip).toContain('evenodd')
  expect(start.mid.from.shown).toBe('visible')
  expect(start.end.from).toEqual({ transform: '', clip: '', z: '', shown: 'hidden' })
  expect(start.end.to).toEqual({ transform: '', clip: '', z: '', shown: 'visible' })
  await page.close()
  // The full radius reaches the farthest corner: hypot(1620, 880).
  const again = await open('#/b/pushed/1')
  const end = await across(again, 0.999)
  expect(parseFloat(end.mid.to.clip.slice('circle('.length))).toBeCloseTo(Math.hypot(1620, 880), -1)
  await again.close()
})

// Back always cuts: interrupted mid-push or mid-iris, nothing is left moved or clipped.
for (const [hash, kind] of [['#/a/two/1', 'push'], ['#/b/pushed/1', 'iris']])
  test(`back during a ${kind} cuts cleanly`, async () => {
    const page = await open(hash)
    const r = await page.evaluate(async () => {
      const k = window.klappe
      const kinds: string[] = []
      k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
      const at = k.stepper.index
      const forward = k.stepper.next()
      await new Promise((r) => setTimeout(r, 200))
      await k.stepper.prev()
      await forward
      return {
        kinds,
        back: k.stepper.index === at,
        styles: k.canvases.map((c: { el: HTMLElement }) => [c.el.style.transform, c.el.style.clipPath, c.el.style.zIndex].join('')),
        shown: k.canvases.map((c: { el: HTMLElement }) => getComputedStyle(c.el).visibility).filter((v: string) => v === 'visible').length,
      }
    })
    expect(r.kinds).toEqual([kind, 'cut'])
    expect(r.back).toBe(true)
    expect(r.styles).toEqual(['', '', ''])
    expect(r.shown).toBe(1)
    await page.close()
  })

test('an unknown push direction logs and plays a fade', async () => {
  const page = await open('#/a/two/1')
  const r = await page.evaluate(async () => {
    const k = window.klappe
    const errors: string[] = []
    const log = console.error
    console.error = (m: string) => errors.push(m)
    const entry = k.canvases[1].entries.b
    entry.opts = { direction: 'sideways' }
    const kinds: string[] = []
    k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
    await k.stepper.next()
    console.error = log
    return { kinds, errors }
  })
  expect(r.kinds).toEqual(['fade'])
  expect(r.errors).toEqual([expect.stringContaining('push: direction "sideways"')])
  await page.close()
})

// The push slides the whole frame: reduced motion fades instead. The iris moves no content, so it stays.
test('reduced motion plays a fade for push and keeps the iris', async () => {
  const kinds = async (flag: string) => {
    const page = await open('', `&reducedmotion=${flag}`)
    const k = await page.evaluate(() => window.klappe.canvases.flatMap((c: any) => Object.values(c.entries).map((e: any) => e.kind)))
    await page.close()
    return k as string[]
  }
  expect(await kinds('0')).toEqual(expect.arrayContaining(['push', 'iris']))
  const reduced = await kinds('1')
  expect(reduced).not.toContain('push')
  expect(reduced).toContain('iris')
})
