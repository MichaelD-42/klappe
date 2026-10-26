import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

const PROBLEMS = ['sections/10-a/30-long/scene.ts: terminal: 30 lines do not fit; max 16']

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk passes on the terminal fixture at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-terminal`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual(PROBLEMS)
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
  })

// A deep link onto command 2 shows command 1 and its output complete, and command 2 complete.
test('a deep link onto command 2 shows both commands typed and their output', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-terminal#/a/run/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  const r = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-scene="run"] .k-term > div')].map((e) => ({
      text: e.textContent,
      shown: e.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
    })),
  )
  expect(r).toEqual([
    { text: '$ npm test', shown: true },
    { text: '3 passed', shown: true },
    { text: '$ npm run build', shown: true },
    { text: 'compiling', shown: true },
    { text: 'done', shown: true },
  ])
  await page.close()
})

// A command without output once made gsap.set([]) log "GSAP target not found" on every load.
test('the fixture loads without GSAP warnings', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const warns: string[] = []
  page.on('console', (m) => void (m.type() === 'warning' && warns.push(m.text())))
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-terminal`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  expect(warns.filter((w) => w.includes('GSAP'))).toEqual([])
  await page.close()
})

// wrap: the 143-character command wraps onto indented rows inside the panel; the next command sits below it.
test('wrap: a long command wraps inside the panel and the rows below move down', async () => {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-terminal#/a/wrap/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  const r = await page.evaluate(() => {
    const term = document.querySelector<HTMLElement>('[data-scene="wrap"] .k-term')!
    const rows = [...term.querySelectorAll<HTMLElement>(':scope > div')]
    const lh = parseFloat(term.style.lineHeight)
    const box = term.getBoundingClientRect()
    return {
      texts: rows.map((e) => e.textContent),
      lines: rows.map((e) => Math.round(e.offsetHeight / lh)),
      stacked: rows.every((e, i) => i === 0 || e.offsetTop >= rows[i - 1].offsetTop + rows[i - 1].offsetHeight),
      inside: rows.every((e) => e.scrollWidth <= e.clientWidth && e.getBoundingClientRect().bottom <= box.bottom + 0.5),
    }
  })
  expect(r.texts[0]!.split('\n  ').join('')).toHaveLength(2 + 143) // the breaks only add the newline and the indent
  expect(r.texts[0]).toMatch(/^\$ irm .* -Quiet$/s)
  expect(r.texts.slice(1)).toEqual(['$ ls', 'setup.ps1'])
  expect(r.lines[0]).toBeGreaterThan(1)
  expect(r.lines.slice(1)).toEqual([1, 1])
  expect(r.stacked).toBe(true)
  expect(r.inside).toBe(true)
  await page.close()
})
