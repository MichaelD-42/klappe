import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The fixture's one move outside the axis is its only problem.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1024, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek and roadmap text is legible at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-roadmap${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['roadmap: today "2027-06-01" is outside the axis'])
  }, 120_000)

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-roadmap${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

// The today label, the marker's x on screen, and whether each milestone label is in --k-accent (or hidden).
const state = (page: Page) =>
  page.evaluate(() => {
    const scene = document.querySelector('div[data-scene="walk"]')!
    const probe = scene.appendChild(document.createElement('div'))
    probe.style.color = 'var(--k-accent)'
    const accent = getComputedStyle(probe).color
    probe.remove()
    const marker = scene.querySelector<HTMLElement>('[data-k-roadmap-today]')!
    const ms = Object.fromEntries(
      [...scene.querySelectorAll<HTMLElement>('[data-k-roadmap-milestone]')].map((m) => [
        m.dataset.kRoadmapMilestone,
        getComputedStyle(m).visibility === 'hidden' ? 'hidden' : getComputedStyle(m.firstElementChild!).color === accent ? 'accent' : 'settled',
      ]),
    )
    return { today: marker.firstElementChild!.textContent, x: Math.round(marker.getBoundingClientRect().x), ms }
  })

test('milestones appear in --k-accent and settle; the today marker moves and its date follows, in German', async () => {
  let page = await open('#/a/walk/3')
  const before = await state(page)
  expect(before.today).toBe('Heute20. Juli 2026')
  expect(before.ms).toEqual({ kick: 'settled', beta: 'accent', ga: 'hidden' })
  await page.close()
  page = await open('#/a/walk/4')
  const after = await state(page)
  expect(after.today).toBe('Heute24. Okt. 2026')
  expect(after.x).toBeGreaterThan(before.x + 300)
  expect(after.ms).toEqual({ kick: 'settled', beta: 'settled', ga: 'hidden' })
  await page.close()
}, 60_000)

// The early scene builds the move to December before the move to October. The start date is read when the step is
// added, so step 3 starts where step 2 ended: just after it starts, the marker is still at October, not back in July.
test('move adders built out of step order still move from where the marker is', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-roadmap#/a/early/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  const read = () =>
    page.evaluate(() => {
      const m = document.querySelector<HTMLElement>('[data-scene="early"] [data-k-roadmap-today]')!
      return { today: m.firstElementChild!.textContent, x: Math.round(m.getBoundingClientRect().x) }
    })
  const before = await read()
  expect(before.today).toBe('Heute24. Okt. 2026')
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(100)
  const start = await read()
  expect(start.x).toBeGreaterThanOrEqual(before.x - 2)
  await page.clock.runFor(2000)
  expect((await read()).today).toBe('Heute10. Dez. 2026')
  await page.close()
}, 60_000)

// With reduced motion the marker and its date jump, and a milestone dot shows at full size at once.
test('with reduced motion, the today marker jumps and the dot does not pop', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.clock.install()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-roadmap&reducedmotion=1#/a/walk/3`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.clock.runFor(500)
  const before = await state(page)
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(50)
  const after = await state(page)
  expect(after.today).toBe('Heute24. Okt. 2026')
  expect(after.x).toBeGreaterThan(before.x + 300)
  await page.evaluate(() => void window.klappe.stepper.next())
  await page.clock.runFor(50)
  const dot = await page.evaluate(() => {
    const c = [...document.querySelectorAll<SVGCircleElement>('[data-scene="walk"] circle')].at(-1)!
    return { shows: getComputedStyle(c).visibility, scale: Math.round(new DOMMatrix(getComputedStyle(c).transform).a * 100) / 100 }
  })
  expect(dot).toEqual({ shows: 'visible', scale: 1 })
  await page.close()
}, 60_000)
