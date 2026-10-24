import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// The fixture's one move outside the axis is its only problem.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and roadmap text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-roadmap`, vp)
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
