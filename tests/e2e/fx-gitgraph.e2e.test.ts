import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-gitgraph`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['gitGraph: next() after the last op'])
  }, 120_000)

// After the rebase the originals are gone and their copies sit on the feature lane past main's tip; the merge lands on main.
test('a rebase moves the branch past the target tip, and the merge joins it on main', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const at = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-gitgraph#/a/steps/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() =>
      Object.fromEntries(
        [...document.querySelectorAll<HTMLElement>('[data-scene="steps"] [data-k-git-commit]')].map((e) => {
          const b = e.getBoundingClientRect()
          return [e.textContent, { x: b.x, y: b.y, on: getComputedStyle(e).visibility === 'visible' && +getComputedStyle(e).opacity > 0.9 }]
        }),
      ),
    )
  }
  const before = await at(5)
  expect([before.form.on, before.tests.on, before['form′'].on]).toEqual([true, true, false])
  const after = await at(6)
  expect([after.form.on, after.tests.on, after['form′'].on, after['tests′'].on]).toEqual([false, false, true, true])
  expect(after['form′'].x).toBeGreaterThan(after.hotfix.x)
  expect(after['form′'].y).toBeCloseTo(before.form.y, 0)
  const merged = await at(7)
  expect(merged['merge feature']).toMatchObject({ on: true, y: merged.hotfix.y })
  expect(merged['merge feature'].x).toBeGreaterThan(merged['tests′'].x)
  await page.close()
}, 60_000)
