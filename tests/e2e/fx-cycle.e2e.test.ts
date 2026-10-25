import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The fixture's one over-long phase label is its only problem. Reduced motion has no branch: nothing moves.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1024, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek and cycle text is legible at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-cycle${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['cycle: label "An extraordinarily long phase name that cannot fit two lines" too long'])
  }, 120_000)

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-cycle#/a/${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(900)
  return page
}

// Which boxes and links of the scene are in the accent (a box: border and outline; a link: its accent line shows).
async function lit(page: Page, scene: string) {
  return page.evaluate((scene) => {
    const probe = document.body.appendChild(document.createElement('div'))
    probe.style.color = getComputedStyle(document.documentElement).getPropertyValue('--k-accent').trim()
    const want = getComputedStyle(probe).color
    probe.remove()
    const s = `[data-scene="${scene}"]` // the scene's html and svg layers both carry it
    const boxes = [...document.querySelectorAll<HTMLElement>(`${s} [data-k-cycle-phase], ${s} [data-k-v-level]`)]
      .filter((el) => getComputedStyle(el).borderTopColor === want && getComputedStyle(el).outlineColor === want)
      .map((el) => el.getAttribute('data-k-cycle-phase') ?? el.getAttribute('data-k-v-level'))
    const links = [...document.querySelectorAll<SVGElement>(`${s} [data-k-v-link]`)]
      .filter((el) => el.checkVisibility({ opacityProperty: true, visibilityProperty: true }))
      .map((el) => el.getAttribute('data-k-v-link'))
    return { boxes, links }
  }, scene)
}

test('a phase stays lit until the next phase step, and the ring comes back round to the first', async () => {
  for (const [step, boxes] of [[2, ['0']], [5, ['3']], [6, ['0']]] as const) {
    const page = await open(`pdca/${step}`)
    expect(await lit(page, 'pdca'), `step ${step}`).toEqual({ boxes, links: [] })
    await page.close()
  }
}, 60_000)

test('a level lights both its boxes, a link its line (its own pair stays lit); either settles when the next one lights', async () => {
  for (const [step, want] of [
    [2, { boxes: ['0-left', '0-right'], links: [] }],
    [3, { boxes: ['0-left', '0-right'], links: ['0'] }],
    [4, { boxes: [], links: ['3'] }],
    [5, { boxes: ['3-left', '3-right'], links: [] }],
    [6, { boxes: ['3-left', '3-right'], links: [] }],
  ] as const) {
    const page = await open(`v/${step}`)
    expect(await lit(page, 'v'), `step ${step}`).toEqual(want)
    await page.close()
  }
}, 60_000)

// The early scene builds phase(2) before phase(0): the lit phase is tracked when the step is added, so
// phase 0 lights on step 2 and settles on step 3.
test('phase adders built out of step order light in step order', async () => {
  for (const [step, boxes] of [[2, ['0']], [3, ['2']]] as const) {
    const page = await open(`early/${step}`)
    expect(await lit(page, 'early'), `step ${step}`).toEqual({ boxes, links: [] })
    await page.close()
  }
}, 60_000)
