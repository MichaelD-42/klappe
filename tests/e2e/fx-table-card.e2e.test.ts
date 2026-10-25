import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const PROBLEMS = [
  'compareTable: row 1 has 2 cells for 3 columns',
  'compareTable: no row 9',
  'compareTable: 30 rows do not fit 600px at 20px text',
  'exerciseCard: no extra 4',
  'exerciseCard: "Too tall" does not fit 300px at 20px text',
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
    await page.waitForTimeout(300)
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
  await page.waitForTimeout(300)
  expect(warned).toEqual([])
  await page.close()
}, 60_000)
