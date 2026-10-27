import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const PROBLEMS = [
  'sections/10-a/20-broken/scene.ts: compareTable: row 1 has 2 cells for 3 columns',
  'sections/10-a/20-broken/scene.ts step 3: compareTable: no row 9',
  'sections/10-a/30-tall/scene.ts step 1: compareTable: 30 rows do not fit 600px at 20px text',
  'sections/10-a/40-card/scene.ts step 4: exerciseCard: no extra 4',
  'sections/10-a/50-card-tall/scene.ts step 1: exerciseCard: "Too tall" does not fit 300px at 20px text',
]

// Reduced motion too: the marks and extras fade without the pop and slide.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek and the text is legible at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-table-card${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect([...r.problems].sort()).toEqual([...PROBLEMS].sort())
  }, 120_000)

test('the newest row is lit in --k-accent and settles to --k-fg on the next row', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const colours = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-table-card#/a/order/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('div[data-scene="order"]')!
      const probe = root.appendChild(document.createElement('i'))
      const token = (t: string) => ((probe.style.color = `var(${t})`), getComputedStyle(probe).color)
      const tk = { fg: token('--k-fg'), accent: token('--k-accent') }
      const labels = ['Single sign-on', 'Audit log', 'Support'].map((t) => [...root.querySelectorAll<HTMLElement>('div')].find((d) => !d.childElementCount && d.textContent === t)!)
      return labels.map((l) => {
        const s = getComputedStyle(l.parentElement!)
        const c = getComputedStyle(l).color
        return s.visibility === 'hidden' ? 'hidden' : c === tk.accent ? 'accent' : c === tk.fg ? 'fg' : c
      })
    })
  }
  expect(await colours(2)).toEqual(['accent', 'hidden', 'hidden'])
  expect(await colours(3)).toEqual(['fg', 'accent', 'hidden'])
  expect(await colours(4)).toEqual(['fg', 'fg', 'accent'])
  await page.close()
}, 90_000)

// A row of text only and a card without extras have nothing to set: GSAP must not warn about a missing target.
test('a row without marks and a card without extras build without a GSAP warning', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const warned: string[] = []
  page.on('console', (m) => m.text().includes('GSAP target') && warned.push(m.text()))
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-table-card#/a/card-tall/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  expect(warned).toEqual([])
  await page.close()
}, 60_000)

test('column(i) lights one column from the header through the last row; the next moves it; column(null) clears it', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  const state = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-table-card#/a/lit/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    return page.evaluate(() => {
      const root = document.querySelector<HTMLElement>('div[data-scene="lit"]')!
      const table = root.querySelector<HTMLElement>('[data-k-compare]')!
      const bands = [...table.querySelectorAll<HTMLElement>('[data-k-compare-column]')]
      const shown = bands.filter((b) => getComputedStyle(b).visibility === 'visible' && getComputedStyle(b).opacity === '1')
      const head = [...table.firstElementChild!.children].slice(1) as HTMLElement[]
      const t = table.getBoundingClientRect()
      return {
        lit: shown.map((b) => b.dataset.kCompareColumn),
        // The band covers its header cell and reaches the table's bottom.
        covers: shown.every((b) => {
          const [r, h] = [b.getBoundingClientRect(), head[+b.dataset.kCompareColumn!].getBoundingClientRect()]
          return r.left <= h.left && r.right >= h.right && r.top <= h.top && Math.abs(r.bottom - t.bottom) < 2
        }),
      }
    })
  }
  expect(await state(2)).toEqual({ lit: ['1'], covers: true })
  expect(await state(3)).toEqual({ lit: ['2'], covers: true })
  expect(await state(4)).toEqual({ lit: [], covers: true })
  await page.close()
}, 90_000)
