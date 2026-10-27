import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

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
    expect(r.problems).toEqual(['sections/10-a/20-outside/scene.ts step 2: roadmap: today "2027-06-01" is outside the axis'])
  }, 120_000)

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-roadmap${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

// The today label, the marker's x on screen, and whether each milestone label is in --k-accent (or hidden).
const state = (page: Page, name = 'walk') =>
  page.evaluate((name) => {
    const scene = document.querySelector(`div[data-scene="${name}"]`)!
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
  }, name)

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

// The rush scene's step 3 lands b to i in one step, each gap 0.7 of the one before: 0.6 s, then 0.42 s, and so on.
// The last label pops (its scale goes out and back to 1); with reduced motion the cadence stays and no label pops.
for (const q of ['', '&reducedmotion=1'])
  test(`rush lands its milestones sooner and sooner in one step, in --k-accent, and they settle${q}`, async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.clock.install()
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-roadmap${q}#/a/rush/2`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await page.clock.runFor(1000)
    const scale = () =>
      page.evaluate(() => new DOMMatrix(getComputedStyle(document.querySelector('[data-scene="rush"] [data-k-roadmap-milestone="i"]')!).transform).a)
    await page.evaluate(() => void window.klappe.stepper.next())
    await page.clock.runFor(700)
    const early = (await state(page, 'rush')).ms
    expect([early.a, early.b, early.c, early.i]).toEqual(['settled', 'accent', 'hidden', 'hidden'])
    await page.clock.runFor(1490) // the last landing starts at 1.84 s; its label pops 0.2 s on and peaks 0.15 s later
    expect(await scale()).toBeGreaterThan(q ? 0.99 : 1.05)
    expect(await scale()).toBeLessThan(q ? 1.01 : 1.2)
    await page.clock.runFor(1000)
    const end = (await state(page, 'rush')).ms
    expect(Object.values(end)).toEqual(['settled', ...Array(8).fill('accent')])
    expect(await scale()).toBe(1)
    await page.evaluate(() => void window.klappe.stepper.next())
    await page.clock.runFor(100)
    expect(Object.values((await state(page, 'rush')).ms)).toEqual(Array(9).fill('settled'))
    await page.close()
  }, 60_000)

// The dots scene rushes ten dots (two on one day, all close) between labelled milestones: they pop in --k-accent with no
// label, and the next step settles them. The walk above checks play equals seek on this scene too and that no dot is "too close".
test('dots land in one rush without a label, take --k-accent, and settle', async () => {
  const page = await open('#/a/dots/4')
  const dots = () =>
    page.evaluate(() => {
      const scene = document.querySelector('g[data-scene="dots"]')!
      const probe = document.body.appendChild(document.createElement('div'))
      probe.style.color = 'var(--k-accent)'
      const accent = getComputedStyle(probe).color
      probe.remove()
      const c = [...scene.querySelectorAll<SVGCircleElement>('circle')]
      const fill = (e: Element) => getComputedStyle(e).fill
      return {
        circles: c.length,
        boxes: document.querySelectorAll('div[data-scene="dots"] [data-k-roadmap-milestone]').length,
        shown: c.filter((e) => getComputedStyle(e).visibility === 'visible').length,
        accent: c.filter((e) => fill(e) === accent).length,
      }
    })
  expect(await dots()).toEqual({ circles: 13, boxes: 3, shown: 12, accent: 10 })
  await page.evaluate(() => void window.klappe.stepper.next())
  await settle(page)
  expect(await dots()).toEqual({ circles: 13, boxes: 3, shown: 13, accent: 1 })
  await page.close()
}, 60_000)

test('a phase grows in its lane in the accent and settles on the next step; overlapping phases take two lanes', async () => {
  const phases = async (step: number) => {
    const page = await open(`#/a/phased/${step}`)
    const r = await page.evaluate(() => {
      const scene = document.querySelector('div[data-scene="phased"]')!
      const probe = scene.appendChild(document.createElement('div'))
      probe.style.color = 'var(--k-accent)'
      const accent = getComputedStyle(probe).color
      probe.remove()
      const bars = [...scene.querySelectorAll<HTMLElement>('[data-k-roadmap-phase]')]
      const axis = Math.max(...[...scene.querySelectorAll<HTMLElement>('[data-k-roadmap-milestone]')].map((m) => m.getBoundingClientRect().bottom))
      return {
        state: bars.map((b) => (getComputedStyle(b).visibility === 'hidden' ? 'hidden' : getComputedStyle(b).borderColor === accent ? 'accent' : 'settled')),
        tops: bars.map((b) => Math.round(b.getBoundingClientRect().top)),
        // Every milestone label ends above every bar: with phases, milestones sit above the axis.
        above: bars.every((b) => b.getBoundingClientRect().top > axis),
      }
    })
    await page.close()
    return r
  }
  expect((await phases(2)).state).toEqual(['accent', 'hidden'])
  const last = await phases(4)
  expect(last.state).toEqual(['settled', 'accent'])
  expect(last.tops[1]).toBeGreaterThan(last.tops[0])
  expect(last.above).toBe(true)
})
