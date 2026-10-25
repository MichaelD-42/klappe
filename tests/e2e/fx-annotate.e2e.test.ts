import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-annotate`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['annotate: circle target has no size to measure'])
  }, 120_000)

// Each mark is drawn on its word, measured through the stage scale, and sits above the text.
test('each mark lands on its word and paints above the text', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-annotate#/a/marks/7`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(500)
  const r = await page.evaluate(() =>
    ['circle', 'underline', 'box', 'strike', 'arrow'].map((kind) => {
      const word = document.querySelector(`[data-word="${kind}"]`)!.getBoundingClientRect()
      const mark = document.querySelector(`[data-scene="marks"] svg[data-k-annotation="${kind}"] path`)!.getBoundingClientRect()
      const svg = document.querySelector<SVGElement>(`[data-scene="marks"] svg[data-k-annotation="${kind}"]`)!
      // The word's centre column meets the mark, and the mark is on top of the paragraph.
      const overlapX = Math.min(word.right, mark.right) - Math.max(word.left, mark.left)
      return { kind, overlapX: overlapX > 0, near: Math.abs((mark.top + mark.bottom) / 2 - (word.top + word.bottom) / 2) < 120, z: getComputedStyle(svg).zIndex }
    }),
  )
  for (const m of r) expect(m).toEqual({ kind: m.kind, overlapX: true, near: true, z: '4' })
  await page.close()
}, 60_000)

// An underline on a phrase that wraps runs under each of its lines, not under the paragraph's whole width.
test('an underline on a wrapped phrase draws one stroke per line, each as wide as its line', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-annotate#/a/marks/9`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(500)
  const r = await page.evaluate(() => {
    const range = document.createRange()
    range.selectNodeContents(document.querySelector('[data-word="wrapped"]')!)
    const lines = [...range.getClientRects()].filter((q) => q.width > 1)
    const paths = [...document.querySelectorAll('[data-scene="marks"] svg[data-k-annotation="underline"]')]
      .at(-1)!
      .querySelectorAll('path')
    return {
      lines: new Set(lines.map((q) => Math.round(q.bottom))).size,
      paths: [...paths].map((p) => {
        const b = p.getBoundingClientRect()
        return { left: b.left, right: b.right }
      }),
      line: lines.map((q) => ({ left: q.left, right: q.right })),
    }
  })
  // How many lines depends on the font (CI's is wider): one stroke per line, whatever the count.
  expect(r.lines).toBeGreaterThanOrEqual(2)
  expect(r.paths).toHaveLength(r.lines)
  // Each stroke spans no more than its own line's text, plus the pad on each side.
  const widest = Math.max(...r.line.map((q) => q.right - q.left))
  for (const p of r.paths) expect(p.right - p.left).toBeLessThan(widest + 40)
  expect(Math.abs(r.paths[0].right - r.paths[1].right)).toBeGreaterThan(10)
  await page.close()
}, 60_000)

// A highlight on a phrase that wraps: one band per line, no wider than its line, and painted behind the text.
test('a highlight on a wrapped phrase draws one band per line, behind the text', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-annotate#/a/marks/8`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(800)
  const r = await page.evaluate(() => {
    const span = document.querySelector('[data-word="wrapped"]')!
    const range = document.createRange()
    range.selectNodeContents(span)
    const lines = [...range.getClientRects()].filter((q) => q.width > 1)
    const paths = [...document.querySelectorAll<SVGPathElement>('[data-scene="marks"] svg[data-k-annotation="highlight"] path')]
    // Paint order, not a z-index string: at a glyph's centre the text must come before the band.
    paths.forEach((p) => (p.style.pointerEvents = 'auto'))
    const q = lines[0]
    const stack = document.elementsFromPoint(q.left + q.width / 2, q.top + q.height / 2)
    return {
      lines: new Set(lines.map((l) => Math.round(l.bottom))).size,
      widths: paths.map((p) => p.getBoundingClientRect().width),
      widest: Math.max(...lines.map((l) => l.width)),
      textFirst: stack.indexOf(span) >= 0 && stack.indexOf(span) < stack.indexOf(paths[0]),
    }
  })
  expect(r.lines).toBeGreaterThanOrEqual(2)
  expect(r.widths).toHaveLength(r.lines)
  for (const w of r.widths) expect(w).toBeLessThan(r.widest + 40)
  expect(r.textFirst).toBe(true)
  await page.close()
}, 60_000)
