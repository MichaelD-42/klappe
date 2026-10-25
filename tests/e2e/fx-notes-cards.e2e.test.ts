import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

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
  await settle(page)
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
  await settle(page)
  expect(await note(page, 'notes', 'a')).toEqual({ col: 'pain', tilt: 0 })
  await page.close()
}, 60_000)

// Visible notes as unrotated boxes (from their transform, so a lean does not grow them), each with whether it is
// grouped (upright and inside a visible label's column), and the columns of the visible labels down to the scene's foot.
const board = (page: Page, scene: string) =>
  page.evaluate((scene) => {
    const root = document.querySelector<HTMLElement>(`div[data-scene="${scene}"]`)!
    const shows = (e: Element) => e.checkVisibility({ opacityProperty: true, visibilityProperty: true })
    const cols = [...root.querySelectorAll<HTMLElement>('[data-k-note-group]')].filter(shows).map((l) => ({ x: l.offsetLeft, y: l.offsetTop, w: l.offsetWidth, h: 2000 }))
    const notes = [...root.querySelectorAll<HTMLElement>('[data-k-note]')].filter(shows).map((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform)
      return { id: el.dataset.kNote!, x: m.e, y: m.f, w: el.offsetWidth, h: el.offsetHeight, upright: Math.abs(m.b) < 1e-6 }
    })
    return { cols, notes }
  }, scene)
type Box = { x: number; y: number; w: number; h: number }
const apart = (a: Box, b: Box) => a.x + a.w <= b.x + 0.5 || b.x + b.w <= a.x + 0.5 || a.y + a.h <= b.y + 0.5 || b.y + b.h <= a.y + 0.5

// Scattered notes stay clear of each other and of every formed group's column; grouped notes do not overlap either.
for (const [name, url, scene, steps] of [
  ['fixture', '/?fixture=fx-notes-cards#/a/notes/', 'notes', 6],
  ['demo', '/#/notes-cards/affinity/', 'affinity', 4],
] as const)
  test(`no note overlaps another or a formed group column (${name})`, async () => {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
    for (let step = 1; step <= steps; step++) {
      await page.goto(`${inject('BASE_URL')}${url}${step}`)
      await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
      await settle(page)
      const { cols, notes } = await board(page, scene)
      const scattered = notes.filter((n) => !n.upright)
      for (let i = 0; i < notes.length; i++)
        for (let j = i + 1; j < notes.length; j++) expect(apart(notes[i], notes[j]), `step ${step}: ${notes[i].id} and ${notes[j].id}`).toBe(true)
      for (const n of scattered) for (const c of cols) expect(apart(n, c), `step ${step}: ${n.id} in a column`).toBe(true)
    }
    await page.close()
  }, 90_000)
