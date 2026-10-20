import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(query: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?${query}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}
const token = (page: Page, name: string) =>
  page.evaluate((n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim(), name)

const sizes = [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
]

test('a theme that sets one token walks ok and keeps calm for the rest', async () => {
  for (const vp of sizes) {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=theme-partial`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }
  const page = await open('fixture=theme-partial')
  expect(await token(page, '--k-accent')).toBe('#ff9f1c')
  expect(await token(page, '--k-bg')).toBe('#0f1b2d')
  await page.close()
})

test('a theme with poor contrast is a deck problem', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=theme-lowcontrast`)
  expect(r.problems).toContain('theme: --k-fg on --k-bg contrast 1.9 < 4.5')
  expect(r.problems.every((p) => /^theme: --k-(?:fg|muted|accent) on --k-(?:bg|surface) contrast [\d.]+ < [\d.]+$/.test(p))).toBe(true)
})

for (const vp of sizes)
  test(`theme-bold walks green at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=theme-bold`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  })

test('?theme=bold switches a deck to the bold palette', async () => {
  const page = await open('fixture=two-scenes&theme=bold')
  expect(await token(page, '--k-bg')).toBe('#1b0b33')
  await page.close()
  const calm = await open('fixture=two-scenes')
  expect(await token(calm, '--k-bg')).toBe('#0f1b2d')
  await calm.close()
})
