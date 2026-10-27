import { chromium } from '@playwright/test'
import { expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

// The fixture causes exactly three problems: an unknown current row, too many rows and an unknown icon.
for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: play equals seek and agenda text is legible at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-agenda`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['sections/10-a/40-unknown/scene.ts: agenda: no row "Nope"', "sections/10-a/95-bad-icon/scene.ts: icon: unknown Lucide name 'no-such-icon'", 'sections/10-a/60-many/scene.ts step 1: agenda: 24 rows do not fit 600px at 20px text'])
  })

// slide: false: show puts the marker on the current row with one set, no slide from the first row.
test('slide: false shows the marker in place on the current row', async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-agenda#/a/hop/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  const r = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-scene="hop"] > div')!
    const bar = root.lastElementChild as HTMLElement
    const tweens = window.klappe.canvases[0].tl.getTweensOf(bar)
    return { durations: tweens.map((t: { duration(): number }) => t.duration()), top: bar.offsetTop, row: (root.children[1] as HTMLElement).offsetTop, shown: getComputedStyle(bar).visibility }
  })
  await browser.close()
  expect(r.durations).toEqual([0, 0.7]) // the show's set, then the move's slide
  expect(r.top).toBe(r.row)
  expect(r.shown).toBe('visible')
})

// An icon sits before the title, as tall as the text and in the row's colour; a row without one keeps its title first.
test('a row icon is text-sized and takes the row colour', async () => {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-agenda#/a/icons/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  const r = await page.evaluate(() => {
    const rows = [...document.querySelectorAll<HTMLElement>('[data-scene="icons"] > div > div')].slice(0, 4)
    return rows.map((row) => {
      const text = row.lastElementChild as HTMLElement
      const svg = text.querySelector('svg')
      const scale = row.getBoundingClientRect().height / row.offsetHeight // the stage scale
      return {
        first: text.firstChild?.nodeName,
        size: svg && svg.getBoundingClientRect().height / scale / parseFloat(getComputedStyle(text).fontSize),
        same: svg ? getComputedStyle(svg).color === getComputedStyle(row).color : null,
        shapes: svg?.querySelectorAll('path,circle,rect,line').length ?? 0,
      }
    })
  })
  await browser.close()
  expect(r.map((x) => x.first)).toEqual(['svg', 'svg', 'svg', '#text'])
  for (const x of r.slice(0, 3)) {
    expect(x.size).toBeCloseTo(1, 1)
    expect(x.same).toBe(true)
    expect(x.shapes).toBeGreaterThan(0)
  }
})
