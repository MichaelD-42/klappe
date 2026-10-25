import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

// The driver's wait grows with the deck (selftestTimeout); this ceiling only stops a hung run.
const WALK_CEILING_MS = 1_800_000

// Review focus 4: play and deep link agree at every step, and text stays legible off 16:9.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
]) {
  test(`walk passes at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk`, vp)
    expect(r.problems).toEqual([])
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBeGreaterThan(0)
    expect(r.ok).toBe(true)
  }, WALK_CEILING_MS)
}

// Text of an earlier scene stays visible off camera; only the current scene is checked for legibility.
test('walk passes on a canvas with two scenes and a camera flight', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=two-scenes`, { w: 1366, h: 768 })
  expect(r.problems).toEqual([])
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.steps).toBe(7)
  expect(r.ok).toBe(true)
})

// Review focus 3: a step-count mismatch must fail the self-test and name the file.
test('walk fails on a deck whose scene.ts and scene.md disagree', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=broken-step-count`)
  expect(r.ok).toBe(false)
  expect(r.problems.some((p) => p.includes('scene.ts'))).toBe(true)
  expect(r.steps).toBeGreaterThan(0)
})

// The size check takes every scale on the way to the screen, not only the camera's: a group scaled
// down inside the scene, in HTML or in SVG, makes its text small too.
test('walk flags text made small by a scaled group', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=small-in-group`, { w: 1366, h: 768 })
  const detail = r.checks.filter((c) => !c.ok).map((c) => c.detail).join(' ')
  expect(detail).toContain('Tiny html')
  expect(detail).toContain('Tiny svg')
})

// A problem raised after document.fonts.ready, or during the walk, still fails the walk.
test('walk reports problems raised after fonts.ready and during the walk', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=late-problem`)
  expect(r.problems.filter((p) => p.includes('late:')).sort()).toEqual(['late: after fonts.ready', 'late: during the walk'].map((p) => expect.stringContaining(p)))
  expect(r.ok).toBe(false)
})

// The on-screen problems list shows a late problem too, not only the ones known at load.
test('the problems panel lists problems raised after load and during a play', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
    await page.goto(`${inject('BASE_URL')}/?fixture=late-problem`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    const panel = () =>
      page.evaluate(() => ({
        summary: document.querySelector('.k-problems summary')?.textContent ?? '',
        items: [...document.querySelectorAll('.k-problems li')].map((li) => li.textContent),
      }))
    await expect.poll(async () => (await panel()).items).toContain('late: after fonts.ready')
    await page.evaluate(() => window.klappe.stepper.next())
    await expect.poll(async () => (await panel()).items).toContain('late: during the walk')
    const r = await panel()
    expect(r.summary).toContain(`(${r.items.length})`)
  } finally {
    await browser.close()
  }
})

// The look checks are soft: ink outside the safe area and clipped text come back as warnings, and the walk still passes.
test('walk warns about ink outside the safe area and clipped text, and still passes', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=safe-area`)
  expect(r.ok).toBe(true)
  expect(r.problems).toEqual([])
  expect(r.warnings).toEqual(
    expect.arrayContaining([
      expect.stringMatching(/safe area: \S+ div: ink \[1500,300,1900,\d+\] outside \[64,48,1856,1032\]/),
      expect.stringMatching(/clipped text: \S+ "Too much text/),
    ]),
  )
  expect(r.warnings.filter((w) => /ink \[-?\d+,700,/.test(w))).toEqual([])
})
