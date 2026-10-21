import { chromium, type Browser } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'

// 20 sections, 100 scenes: every scene has a readable, clickable entry and the current one shows on open.
let browser: Browser
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

test('each scene of a large deck is a readable, separate target; the current one is in view', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=overview-many`)
  await page.waitForFunction(() => window.klappe?.stepper, undefined, { timeout: 30_000 })
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.steps.length - 1, 'cut'))
  await page.keyboard.press('o')
  const bad = await page.evaluate(() => {
    const { deck } = window.klappe
    const titles = deck.sections.flatMap((s: any) => s.scenes.map((sc: any) => sc.title))
    // The card's title; the button's textContent also holds the thumbnail's cloned text.
    const label = (m: Element | null) => m?.querySelector('.k-ov-title')?.textContent
    const markers = [...document.querySelectorAll<HTMLElement>('.k-overlay .k-ov-marker')]
    const out: string[] = []
    if (markers.map(label).join('|') !== titles.join('|')) out.push(`${markers.length} markers, want the ${titles.length} scene titles in order`)
    const cur = document.querySelector<HTMLElement>('.k-overlay .k-ov-marker[aria-current="true"]')
    if (label(cur) !== titles[titles.length - 1]) out.push(`current: ${label(cur)}`)
    if (document.activeElement !== cur) out.push('focus is not on the current scene')
    const view = document.querySelector('.k-overlay-body')!.getBoundingClientRect()
    const r = cur?.getBoundingClientRect()
    if (!r || r.top < view.top || r.bottom > view.bottom) out.push('the current scene opens out of view')
    for (const m of markers) {
      m.scrollIntoView({ block: 'nearest' })
      const b = m.getBoundingClientRect()
      const px = parseFloat(getComputedStyle(m.querySelector('.k-ov-title') ?? m).fontSize) * (b.height / m.offsetHeight)
      if (px < 14) out.push(`${label(m)}: ${px.toFixed(1)} px text`)
      if (b.height < 32 || b.width < 120) out.push(`${label(m)}: ${b.width.toFixed(0)}x${b.height.toFixed(0)} target`)
      if (document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)?.closest('.k-ov-marker') !== m) out.push(`${label(m)}: covered`)
    }
    cur?.focus()
    return out
  })
  expect(bad).toEqual([])
  // Keyboard: Shift+Tab goes to the scene before, Enter jumps there and closes the overview.
  await page.keyboard.press('Shift+Tab')
  const want = await page.evaluate(() => document.activeElement?.querySelector('.k-ov-title')?.textContent)
  await page.keyboard.press('Enter')
  await page.waitForFunction((t) => {
    const k = window.klappe
    const a = k.steps[k.stepper.index]
    return k.deck.sections.find((s: any) => s.id === a.section)?.scenes.find((sc: any) => sc.id === a.scene)?.title === t
  }, want, { timeout: 10_000 })
  expect(await page.evaluate(() => window.klappe.overview.isOpen)).toBe(false)
  await page.close()
})
