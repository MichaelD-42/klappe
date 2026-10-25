import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// Reduced motion too: notes and cards cut to their place instead of moving.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-notes-cards${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

async function open(hash: string, query = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-notes-cards${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

// Where a note is: hidden, scattered (tilted), or which group column its centre is in (by the column's label), and its tilt.
const note = (page: Page, scene: string, id: string) =>
  page.evaluate(
    ([scene, id]) => {
      const el = document.querySelector<HTMLElement>(`[data-scene="${scene}"] [data-k-note="${id}"]`)!
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return { col: 'hidden', tilt: 0 }
      const r = el.getBoundingClientRect()
      const cx = r.x + r.width / 2
      const m = new DOMMatrix(getComputedStyle(el).transform)
      const tilt = Math.round((Math.abs(Math.atan2(m.b, m.a)) * 1800) / Math.PI) / 10
      if (tilt > 0) return { col: 'scattered', tilt }
      const labels = [...document.querySelectorAll<HTMLElement>(`[data-scene="${scene}"] [data-k-note-group]`)]
      const l = labels.find((l) => {
        const b = l.getBoundingClientRect()
        return l.checkVisibility({ opacityProperty: true, visibilityProperty: true }) && cx > b.left && cx < b.right && r.top > b.bottom - 1
      })
      return { col: l?.getAttribute('data-k-note-group') ?? 'scattered', tilt }
    },
    [scene, id] as const,
  )

test('notes appear scattered and tilted, then fly into their group column, upright', async () => {
  let page = await open('#/a/notes/2')
  expect((await note(page, 'notes', 'b')).col).toBe('scattered')
  expect((await note(page, 'notes', 'b')).tilt).toBeGreaterThan(0)
  await page.close()
  page = await open('#/a/notes/3')
  expect(await note(page, 'notes', 'b')).toEqual({ col: 'pain', tilt: 0 })
  expect((await note(page, 'notes', 'c')).col).toBe('scattered')
  await page.close()
  page = await open('#/a/notes/4')
  expect((await note(page, 'notes', 'b')).col).toBe('docs')
  expect((await note(page, 'notes', 'a')).col).toBe('pain')
  await page.close()
}, 60_000)

// The early scene builds group("pain", ["a", "c"]) before show(["a", "b"]): "c" is still hidden after the show,
// and on step 2 "a" moves into pain and "c" fades in there.
test('adders built out of step order still play in step order', async () => {
  let page = await open('#/a/early/1')
  expect((await note(page, 'early', 'a')).col).toBe('scattered')
  expect((await note(page, 'early', 'c')).col).toBe('hidden')
  await page.close()
  page = await open('#/a/early/2')
  expect((await note(page, 'early', 'a')).col).toBe('pain')
  expect((await note(page, 'early', 'c')).col).toBe('pain')
  await page.close()
}, 60_000)

// Card widths (scale, not the bounding box of a leaning card), dims and edges: the pulled one is larger and on top
// with a --k-accent border, the others under a scrim with a --k-line border.
const cards = (page: Page) =>
  page.evaluate(() => {
    const probe = document.body.appendChild(document.createElement('i'))
    const token = (t: string) => ((probe.style.color = `var(${t})`), getComputedStyle(probe).color)
    const tk = { line: token('--k-line'), accent: token('--k-accent') }
    return [...document.querySelectorAll<HTMLElement>('[data-scene="stack"] [data-k-card]')].map((c) => {
      const b = getComputedStyle(c).borderTopColor
      return {
        w: Math.round(c.offsetWidth * Math.hypot(new DOMMatrix(getComputedStyle(c).transform).a, new DOMMatrix(getComputedStyle(c).transform).b)),
        dim: Number(getComputedStyle(c.lastElementChild!).opacity) > 0.2,
        edge: b === tk.accent ? 'accent' : b === tk.line ? 'line' : b,
      }
    })
  })

test('a pulled card is larger and the rest dim; the next pull puts it back; back undims all', async () => {
  let page = await open('#/a/stack/2')
  let r = await cards(page)
  expect(r[1].w).toBeGreaterThan(Math.max(...r.filter((_, i) => i !== 1).map((c) => c.w)))
  expect(r.map((c) => c.dim)).toEqual([true, false, true, true, true])
  expect(r.map((c) => c.edge)).toEqual(['line', 'accent', 'line', 'line', 'line'])
  await page.close()
  page = await open('#/a/stack/3')
  r = await cards(page)
  expect(r[3].w).toBeGreaterThan(r[1].w)
  expect(r.map((c) => c.dim)).toEqual([true, true, true, false, true])
  expect(r.map((c) => c.edge)).toEqual(['line', 'line', 'line', 'accent', 'line'])
  await page.close()
  page = await open('#/a/stack/4')
  expect((await cards(page)).map((c) => c.dim)).toEqual([false, false, false, false, false])
  expect((await cards(page)).map((c) => c.edge)).toEqual(['line', 'line', 'line', 'line', 'line'])
  await page.close()
}, 60_000)

// With reduced motion a group step cuts: just after the press the note is already in its column.
test('with reduced motion a note cuts to its group', async () => {
  const page = await open('#/a/notes/2', '&reducedmotion=1')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(120)
  expect(await note(page, 'notes', 'a')).toEqual({ col: 'pain', tilt: 0 })
  await page.close()
}, 60_000)
