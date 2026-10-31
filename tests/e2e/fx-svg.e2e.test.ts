import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

test('svg walks clean and reports its problems: an unmapped colour, a <style> block, a missing id', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-svg`)
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems.sort()).toEqual([
    'sections/10-a/20-broken/scene.ts step 1: svg: no element with id "nope"',
    'sections/10-a/20-broken/scene.ts: svg: <style> is dropped; export with presentation attributes',
    'sections/10-a/20-broken/scene.ts: svg: colour #123456 has no token; add it to colors or give its element a k-<token> class',
  ].sort())
})

async function open(): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-svg&instant=1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  return page
}
// Each layer's opacity as shown (0 when hidden), and the colours the art paints with.
const state = (page: Page, i: number) =>
  page.evaluate(async (i) => {
    await window.klappe.stepper.goto(i, 'cut')
    const root = document.querySelector('g[data-scene="art"] [data-k-svg]')!
    const shown = (e: Element) => {
      const s = getComputedStyle(e)
      return s.visibility === 'hidden' ? 0 : Math.round(Number(s.opacity) * 100) / 100
    }
    const layers = Object.fromEntries(['tank', 'pump', 'pipe', 'out'].map((id) => [id, shown(root.querySelector(`#${id}`)!)]))
    return { root: shown(root), layers }
  }, i)

test('the base shows first, layers show by id, light dims the others and comes back with null', async () => {
  const page = await open()
  expect(await state(page, 0)).toEqual({ root: 1, layers: { tank: 0, pump: 0, pipe: 0, out: 0 } })
  expect((await state(page, 1)).layers).toEqual({ tank: 1, pump: 1, pipe: 0, out: 0 })
  expect((await state(page, 2)).layers).toEqual({ tank: 1, pump: 1, pipe: 1, out: 1 })
  expect((await state(page, 3)).layers).toEqual({ tank: 0.25, pump: 1, pipe: 0.25, out: 0.25 })
  expect((await state(page, 4)).layers).toEqual({ tank: 0.25, pump: 1, pipe: 1, out: 1 })
  // back to the start: all hidden again
  expect(await state(page, 0)).toEqual({ root: 1, layers: { tank: 0, pump: 0, pipe: 0, out: 0 } })
  await page.close()
})

test('colours follow the theme: hex values by the colors map, a k-<token> class by its name', async () => {
  const page = await open()
  const got = await page.evaluate(() => {
    const root = document.querySelector('g[data-scene="art"] [data-k-svg]')!
    const css = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim()
    const probe = document.body.appendChild(document.createElement('i'))
    const rgb = (v: string) => ((probe.style.color = css(v)), getComputedStyle(probe).color)
    const fill = (sel: string) => getComputedStyle(root.querySelector(sel)!).fill
    const stroke = (sel: string) => getComputedStyle(root.querySelector(sel)!).stroke
    return {
      water: [fill('#tank rect:nth-child(2)'), rgb('--k-accent')],
      pump: [fill('#pump circle'), rgb('--k-accent-2')],
      pipe: [stroke('#pipe path'), rgb('--k-fg')],
      out: [fill('#out rect'), rgb('--k-ok')],
    }
  })
  for (const [k, [a, b]] of Object.entries(got)) expect(a, k).toBe(b)
  await page.close()
})
