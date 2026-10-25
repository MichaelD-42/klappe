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
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-magic-move${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk passes across a magic move at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-magic-move`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.ok).toBe(true)
  })

test('walk passes with reduced motion', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-magic-move&reducedmotion=1`, { w: 1366, h: 768 })
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.ok).toBe(true)
})

// Steps forward, freezes the transition at 0, half way and the landing, and reads the chip stand-ins' centres.
async function across(page: Page) {
  return page.evaluate(async () => {
    const k = window.klappe
    const kinds: string[] = []
    k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
    const centre = (e: Element) => {
      const r = e.getBoundingClientRect()
      return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]
    }
    const chips = () => [...document.querySelectorAll('[data-k-match="chip"]')]
    const from = centre(chips()[0])
    const forward = k.stepper.next()
    await new Promise((r) => requestAnimationFrame(r))
    const tl = k.stepper.running[0]
    tl.pause()
    const flies = () => [...document.querySelectorAll('[data-k-fly]')]
    const read = (t: number) => {
      tl.time(t)
      return {
        flies: flies().length,
        chip: flies().filter((e) => e.textContent === 'Chip').map(centre),
        hidden: document.querySelectorAll('[data-k-fly-hide]').length,
      }
    }
    const frames = { start: read(0), mid: read(tl.labels.reveal / 2), land: read(tl.labels.reveal) }
    tl.play()
    await forward
    return {
      kinds,
      reveal: tl.labels.reveal,
      from,
      to: centre(chips()[1]),
      frames,
      end: {
        flies: flies().length,
        hidden: document.querySelectorAll('[data-k-fly-hide]').length,
        shown: chips()[1].checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        styles: k.canvases.map((c: { el: HTMLElement }) => [c.el.style.transform, c.el.style.clipPath].join('')),
        visible: k.canvases.filter((c: { el: HTMLElement }) => getComputedStyle(c.el).visibility === 'visible').length,
      },
    }
  })
}

const near = (a: number[], b: number[]) => expect(Math.hypot(a[0] - b[0], a[1] - b[1])).toBeLessThan(3)

test('the chip and the dot fly from their old places to their new ones, and nothing stays behind', async () => {
  const page = await open('#/a/one/1')
  const r = await across(page)
  expect(r.kinds).toEqual(['magicMove'])
  expect(r.reveal).toBeCloseTo(0.9)
  // Two pairs (chip and dot), each with its old and its new look; the four real elements hidden meanwhile.
  expect(r.frames.mid.flies).toBe(4)
  expect(r.frames.mid.hidden).toBe(4)
  // Both looks share one centre: on the old chip at the start, half way at the middle (symmetric ease), on the new chip at the landing.
  for (const c of r.frames.start.chip) near(c, r.from)
  for (const c of r.frames.mid.chip) near(c, [(r.from[0] + r.to[0]) / 2, (r.from[1] + r.to[1]) / 2])
  for (const c of r.frames.land.chip) near(c, r.to)
  expect(r.end).toEqual({ flies: 0, hidden: 0, shown: true, styles: ['', '', ''], visible: 1 })
  await page.close()
})

test('no shared key: a plain fade with no stand-in', async () => {
  const page = await open('#/b/two/1')
  const r = await page.evaluate(async () => {
    const k = window.klappe
    const kinds: string[] = []
    k.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
    const forward = k.stepper.next()
    await new Promise((r) => requestAnimationFrame(r))
    const mid = document.querySelectorAll('[data-k-fly]').length
    const duration = k.stepper.running[0].duration()
    await forward
    return { kinds, mid, duration }
  })
  expect(r).toEqual({ kinds: ['magicMove'], mid: 0, duration: 0.4 })
  await page.close()
})

// A key press mid-flight ends the transition: forward or back, no stand-in and no hidden real element remain.
for (const [key, kinds] of [['ArrowRight', ['magicMove', 'magicMove']], ['ArrowLeft', ['magicMove', 'cut']]] as const)
  test(`${key} during the flight leaves nothing behind`, async () => {
    const page = await open('#/a/one/1')
    await page.evaluate(() => {
      const k = window.klappe
      const w = window as unknown as { kinds: string[] }
      w.kinds = []
      k.stepper.on('transition', (e: { kind: string }) => w.kinds.push(e.kind))
      void k.stepper.next()
    })
    await page.waitForTimeout(300)
    const mid = await page.evaluate(() => document.querySelectorAll('[data-k-fly]').length)
    await page.keyboard.press(key)
    await page.waitForFunction(() => window.klappe.stepper.running.length === 0 && window.klappe.stepper.pending === 0)
    await page.waitForTimeout(1500)
    const r = await page.evaluate(() => ({
      kinds: (window as unknown as { kinds: string[] }).kinds,
      flies: document.querySelectorAll('[data-k-fly]').length,
      hidden: document.querySelectorAll('[data-k-fly-hide]').length,
      visible: window.klappe.canvases.filter((c: { el: HTMLElement }) => getComputedStyle(c.el).visibility === 'visible').length,
    }))
    expect(mid).toBe(4)
    expect(r).toEqual({ kinds, flies: 0, hidden: 0, visible: 1 })
    await page.close()
  })

test('reduced motion plays a fade for the magic move', async () => {
  const kinds = async (flag: string) => {
    const page = await open('', `&reducedmotion=${flag}`)
    const k = await page.evaluate(() => window.klappe.canvases.flatMap((c: any) => Object.values(c.entries).map((e: any) => e.kind)))
    await page.close()
    return k as string[]
  }
  expect(await kinds('0')).toContain('magicMove')
  expect(await kinds('1')).not.toContain('magicMove')
})
