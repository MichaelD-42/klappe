import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(hash: string, vp = { width: 1366, height: 768 }): Promise<Page> {
  const page = await browser.newPage({ viewport: vp })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-code${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

// Every line of a scene's code: its number, text and computed opacity.
const lines = (page: Page, scene: string) =>
  page.evaluate(
    (scene) =>
      [...document.querySelectorAll<HTMLElement>(`[data-scene="${scene}"] .k-code [data-line]`)].map((e) => ({
        n: e.dataset.line,
        text: e.textContent,
        opacity: getComputedStyle(e).opacity,
        visible: e.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        y: e.getBoundingClientRect().top,
      })),
    scene,
  )

// The problems the fixture means to cause: the 40-line block, and the bad groups' line 0, reversed range and huge range.
const PROBLEMS = [
  'sections/10-a/40-long/scene.md step 1: code: 40 lines do not fit; max 26',
  'sections/10-a/50-bad/scene.md step 1: code: line 0 out of range (1-20)',
  'sections/10-a/50-bad/scene.md step 1: code: lines 4, 3, 2 out of order; write ranges low to high',
  'sections/10-a/50-bad/scene.md step 1: code: lines 21-999, 99999999 out of range (1-20)',
]

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk passes on the code fixture at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-code`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual(PROBLEMS)
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.steps).toBe(13)
  })

// Review focus 2: a deep link onto group 3 equals playing to it, line by line.
test('a deep link to group 3 shows the same lines focused as playing there', async () => {
  const played = await open('#/a/walk/1')
  await played.evaluate(async () => {
    await window.klappe.stepper.next()
    await window.klappe.stepper.next()
  })
  await played.waitForFunction(() => window.klappe.stepper.index === 2)
  await played.waitForTimeout(1500) // let the focus tweens finish
  const linked = await open('#/a/walk/3')
  const a = (await lines(played, 'walk')).map(({ n, opacity }) => ({ n, opacity }))
  const b = (await lines(linked, 'walk')).map(({ n, opacity }) => ({ n, opacity }))
  expect(a).toEqual(b)
  // Group 3 is line 6 only.
  expect(b.filter((l) => l.opacity === '1').map((l) => l.n)).toEqual(['6'])
  await played.close()
  await linked.close()
})

// Review focus 4: forty lines shrink to the floor, the rest clip, and nothing leaves the panel.
test('a 40-line block shrinks to 20 px and hides the lines that do not fit', async () => {
  const page = await open('#/a/long/1', { width: 1920, height: 1080 })
  const r = await page.evaluate(() => {
    const pre = document.querySelector<HTMLElement>('[data-scene="long"] .k-code')!
    const box = pre.getBoundingClientRect()
    const shown = [...pre.querySelectorAll<HTMLElement>('[data-line]')].filter((e) => e.checkVisibility({ visibilityProperty: true }))
    return {
      size: parseFloat(getComputedStyle(pre).fontSize),
      shown: shown.length,
      inside: shown.every((e) => e.getBoundingClientRect().bottom <= box.bottom + 0.5),
    }
  })
  expect(r).toEqual({ size: 20, shown: 26, inside: true })
  await page.close()
})

test('diff removes, moves and adds lines; line(n) is the line element', async () => {
  const page = await open('#/a/diff/3')
  const after = (await lines(page, 'diff')).filter((l) => l.opacity !== '0').sort((p, q) => p.y - q.y)
  expect(after.map((l) => l.text)).toEqual(['const a = load();', 'save(a);', 'log(a);'])
  const target = await page.evaluate(() => document.querySelector('[data-target]')?.textContent)
  expect(target).toBe('const a = load();')
  await page.close()
})

// A Shiki init failure is logged once and code shows plain: the deck never goes blank.
test('code shows plain when the highlighter fails to load', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const errors: string[] = []
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  await page.route(/shiki_langs/, (r) => r.abort())
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-code#/a/walk/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await page.evaluate(() => {
    const pre = document.querySelector('[data-scene="walk"] .k-code')!
    return { text: pre.querySelector('[data-line="6"]')?.textContent, coloured: pre.querySelectorAll('span[style]').length }
  })
  expect(r).toEqual({ text: '  return sum;', coloured: 0 })
  expect(errors.filter((e) => e.includes('syntax highlighting failed'))).toHaveLength(1)
  await page.close()
})
