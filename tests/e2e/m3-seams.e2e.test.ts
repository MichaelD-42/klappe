import { expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

// The four Markdown parts in plain scene.md files: the walk passes and the only problem is the unbundled fence language.
test('walk: m3-seams passes with only the cobol problem', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=m3-seams`, { w: 1920, h: 1080 })
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems).toHaveLength(1)
  expect(r.problems[0]).toContain('language "cobol" not bundled; shown plain')
})

test('a Markdown table is a comparison table: one row per step, marks from ✓ ✗ ~', async () => {
  const { chromium } = await import('@playwright/test')
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=m3-seams#/a/table/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  const r = await page.evaluate(() => {
    const t = document.querySelector('div[data-scene="table"] [data-k-compare]')!
    return [...t.querySelectorAll('[role="img"]')].map((m) => m.getAttribute('aria-label')).concat(t.textContent!.includes('30 days') ? ['30 days'] : [])
  })
  expect(r).toEqual(['no', 'yes', 'partly', '30 days'])
  await browser.close()
}, 60_000)
