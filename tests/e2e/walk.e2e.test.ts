import { expect, inject, test } from 'vitest'
import { availableParallelism } from 'node:os'
import { runSelftest } from './driver'

// The driver's wait grows with the deck (selftestTimeout); this ceiling only stops a hung run.
const WALK_CEILING_MS = 1_800_000

// `klappe test --only <targets> [--bail] [--strict]` sets these: walk only those scenes, stop at the first failing step,
// and fail on look warnings.
const only = process.env.KLAPPE_ONLY
const strict = !!process.env.KLAPPE_STRICT
const flags = (only ? `&only=${encodeURIComponent(only)}` : '') + (process.env.KLAPPE_BAIL ? '&bail' : '')

// The whole-deck walk is the slowest test: on a machine with cores to spare it runs in parts of whole sections,
// each in its own browser. --only picks scenes itself, so it walks in one part.
const parts = only ? 1 : Math.max(1, Math.min(4, Math.floor(availableParallelism() / 6)))

// Review focus 4: play and deep link agree at every step, and text stays legible off 16:9.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
]) for (let k = 1; k <= parts; k++) {
  // Concurrent: each walks the whole demo, or a part of it, in its own browser.
  test.concurrent(`walk passes at ${vp.w}x${vp.h}${parts > 1 ? ` (part ${k}/${parts})` : ''}`, async ({ expect }) => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk${flags}&part=${k}/${parts}`, vp)
    // The look report for the scenes in hand; a whole deck would print hundreds of lines.
    if (only) console.log(`look at ${vp.w}x${vp.h}: ${r.warnings.length ? '\n' + r.warnings.join('\n') : 'no warnings'}`)
    expect(r.problems).toEqual([])
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    if (strict) expect(r.warnings).toEqual([])
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

// only walks the named scene alone, played on from a cut to the step before it.
test('walk with only checks the named scene alone', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=two-scenes&only=a/second`, { w: 1366, h: 768 })
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.checks.length).toBeGreaterThan(0)
  expect(r.checks.every((c) => c.name.startsWith('step #/a/second/'))).toBe(true)
  expect(r.ok).toBe(true)
  const none = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=two-scenes&only=a/nope`, { w: 1366, h: 768 })
  expect(none.ok).toBe(false)
})

// part=k/N walks the k-th of N runs of whole sections; together the parts cover every step once.
test('walk with part splits the deck by section', async () => {
  const stepsOf = async (part: string) => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=blackout&part=${part}`, { w: 1366, h: 768 })
    expect(r.ok).toBe(true)
    return [...new Set(r.checks.map((c) => c.name.split(':')[0]))]
  }
  expect(await stepsOf('1/3')).toEqual(['step #/a/one/1'])
  expect(await stepsOf('2/3')).toEqual(['step #/b/two/1'])
  expect(await stepsOf('3/3')).toEqual(['step #/c/three/1'])
  expect(await stepsOf('1/1')).toEqual(['step #/a/one/1', 'step #/b/two/1', 'step #/c/three/1'])
})

// bail stops the walk at the first failing step: the fixture fails at both steps, so only step 1 reports.
test('walk with bail stops at the first failing step', async () => {
  const url = `${inject('BASE_URL')}/?selftest=walk&fixture=tiny-two-steps`
  const stepOf = (c: { name: string }) => c.name.split(':')[0]
  const all = await runSelftest(url, { w: 1366, h: 768 })
  expect(new Set(all.checks.filter((c) => !c.ok).map(stepOf))).toEqual(new Set(['step #/a/b/1', 'step #/a/b/2']))
  const bailed = await runSelftest(`${url}&bail`, { w: 1366, h: 768 })
  expect(bailed.ok).toBe(false)
  expect(new Set(bailed.checks.map(stepOf))).toEqual(new Set(['step #/a/b/1']))
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
    await expect.poll(async () => (await panel()).items).toContainEqual(expect.stringContaining('late: after fonts.ready'))
    await page.evaluate(() => window.klappe.stepper.next())
    await expect.poll(async () => (await panel()).items).toContainEqual(expect.stringContaining('late: during the walk'))
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

// Reduced motion turns camera flights into cuts: a step timed against a flight's end (">-0.6") then starts early.
// shot and pdf always run with it, and so may a presenter's laptop.
test('the deck has no problems with reduced motion', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    await page.goto(`${inject('BASE_URL')}/?reducedmotion=1`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 60_000 })
    expect(await page.evaluate(() => window.klappe.problems)).toEqual([])
  } finally {
    await browser.close()
  }
})
