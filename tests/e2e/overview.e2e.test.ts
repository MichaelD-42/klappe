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

// A canvas with 9 scenes in a row was a 25 px sliver: each scene card is a 16:9 thumbnail of its own scene.
test('each scene card is a 16:9 thumbnail', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=overview-many`)
  await page.waitForFunction(() => window.klappe?.stepper, undefined, { timeout: 30_000 })
  await page.keyboard.press('o')
  // Layout px (offset*), not screen px: the stage scales the whole overlay.
  const bad = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('.k-overlay .k-ov-thumb')]
      .map((t, i) => (Math.abs(t.offsetWidth / t.offsetHeight - 16 / 9) > 0.02 ? `card ${i}: ${t.offsetWidth}x${t.offsetHeight}` : ''))
      .filter(Boolean),
  )
  expect(bad).toEqual([])
  await page.close()
})

// Agenda hops all titled "Today": a repeated scene title gets its section's label in front.
test('a repeated scene title shows its section label; a section or scene can set its own overview label', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=overview-labels`)
  await page.waitForFunction(() => window.klappe?.stepper, undefined, { timeout: 30_000 })
  await page.keyboard.press('o')
  const r = await page.evaluate(() => ({
    captions: [...document.querySelectorAll('.k-overlay .k-ov-caption')].map((e) => e.textContent),
    markers: [...document.querySelectorAll('.k-overlay .k-ov-title')].map((e) => e.textContent),
  }))
  expect(r.captions).toEqual(['Intro', 'Lab', 'Wrap-up'])
  expect(r.markers).toEqual(['Intro · Today', 'Why', 'Lab · Today', 'Setup', 'Wrap-up · Today', 'Thanks and questions'])
  await page.close()
})

// Backgrounds sit outside the world, pinned to the screen; each card shows its scene's own, under the copy.
test('a scene card shows its background: the section one, the scene own one, or none', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-fullscreen`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.keyboard.press('o')
  const bgs = await page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll('.k-overlay .k-ov-marker')].map((m) => [
        m.querySelector('.k-ov-title')!.textContent,
        m.querySelector<HTMLImageElement>('.k-ov-bg img')?.getAttribute('src')?.split('/').pop() ?? null,
      ]),
    ),
  )
  expect(bgs['Cover']).toBeNull()
  expect(bgs['Over the ridge']).toBeTruthy()
  expect(bgs['Same sky']).toBe(bgs['Over the ridge'])
  expect(bgs['Its own sky']).toBeTruthy()
  expect(bgs['Its own sky']).not.toBe(bgs['Over the ridge'])
  await page.close()
})

// The section list marks the current section by more than the focus ring or a hover border: a tint and bold text.
test('the section list marks the current section apart from the others', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=overview-many`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.steps.length - 1, 'cut'))
  await page.keyboard.press('s')
  const r = await page.evaluate(() => {
    const look = (b: Element) => {
      const s = getComputedStyle(b)
      return { bg: s.backgroundColor, weight: s.fontWeight }
    }
    const items = [...document.querySelectorAll('.k-selector .k-btn')]
    const cur = items.find((b) => b.getAttribute('aria-current') === 'true')!
    const other = items.find((b) => b !== cur)!
    const view = document.querySelector('.k-selector')!.getBoundingClientRect()
    const box = cur.getBoundingClientRect()
    const inView = box.top >= view.top && box.bottom <= view.bottom
    ;(document.activeElement as HTMLElement | null)?.blur()
    return { cur: look(cur), other: look(other), inView }
  })
  expect(r.inView).toBe(true) // the last section of 20: the list opens scrolled to it
  expect(r.cur.bg).not.toBe(r.other.bg)
  expect(Number(r.cur.weight)).toBeGreaterThan(Number(r.other.weight))
  await page.close()
})
