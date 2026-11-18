import { chromium, type Browser, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { runSelftest } from './driver'

// Deck cuts and the appendix on the fixture cuts. The whole deck: 0 a/one/1, 1 a/one/2, 2 b/two/1, 3 c/three/1, then the
// appendix 4 x/spare/1, 5 x/spare/2. The cut short leaves b out: 0 a/one/1, 1 a/one/2, 2 c/three/1, 3 x/spare/1, 4 x/spare/2.
let browser: Browser
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(query: string, hash: string, index: number): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=cuts${query}${hash}`)
  await page.waitForFunction((i) => window.klappe?.stepper?.index === i, index, { timeout: 30_000 })
  return page
}
const at = (page: Page) =>
  page.evaluate(async () => {
    await window.klappe.stepper.idle
    return location.hash
  })
const press = async (page: Page, key: string) => {
  await page.keyboard.press(key)
  return at(page)
}

test('next and previous never cross into or out of the appendix; End is the last main step', async () => {
  const page = await open('', '#/a/one/1', 0)
  expect(await press(page, 'End')).toBe('#/c/three/1')
  expect(await press(page, 'ArrowRight')).toBe('#/c/three/1')
  await page.evaluate(() => window.klappe.stepper.goto(4, 'cut'))
  expect(await press(page, 'ArrowLeft')).toBe('#/x/spare/1')
  expect(await press(page, 'ArrowRight')).toBe('#/x/spare/2')
  expect(await press(page, 'ArrowRight')).toBe('#/x/spare/2')
  expect(await page.evaluate(() => window.klappe.problems)).toEqual([])
  await page.close()
})

test('Q jumps to the first appendix step and back to where the talk was', async () => {
  const page = await open('', '#/a/one/2', 1)
  expect(await press(page, 'q')).toBe('#/x/spare/1')
  expect(await press(page, 'ArrowRight')).toBe('#/x/spare/2')
  expect(await press(page, 'q')).toBe('#/a/one/2')
  await page.close()
})

test('the speaker counter counts the main talk; in the appendix it counts the appendix', async () => {
  const context = await browser.newContext()
  const main = await context.newPage()
  await main.goto(`${inject('BASE_URL')}/?fixture=cuts#/a/one/2`)
  await main.waitForFunction(() => window.klappe?.stepper?.index === 1, undefined, { timeout: 30_000 })
  const speaker = await context.newPage()
  await speaker.goto(`${inject('BASE_URL')}/?fixture=cuts&speaker=1`)
  await speaker.waitForFunction(() => window.klappe?.speakerView, undefined, { timeout: 30_000 })
  const progress = () => speaker.locator('.k-sp-progress').textContent()
  await expect.poll(progress).toBe('2 / 4')
  await speaker.keyboard.press('q') // from the speaker view too
  await expect.poll(progress).toBe('Appendix 1 / 2')
  await context.close()
})

// The rehearsal of a cut: its own record, its own duration, and the appendix outside the total.
test('the rehearsal under a cut keeps its own record, against the cut\'s duration, without the appendix', async () => {
  const context = await browser.newContext()
  const main = await context.newPage()
  await main.goto(`${inject('BASE_URL')}/?fixture=cuts&cut=short#/a/one/1`)
  await main.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  const speaker = await context.newPage()
  await speaker.goto(`${inject('BASE_URL')}/?fixture=cuts&cut=short&speaker=1`)
  await speaker.waitForFunction(() => window.klappe?.speakerView, undefined, { timeout: 30_000 })
  await expect.poll(() => speaker.locator('.k-sp-progress').textContent()).toBe('1 / 3')
  await speaker.keyboard.press('p')
  await speaker.keyboard.press('q')
  await expect.poll(() => speaker.locator('.k-sp-progress').textContent()).toBe('Appendix 1 / 2')
  await speaker.waitForTimeout(3000) // counted, the appendix would show 00:03 or more
  await speaker.keyboard.press('p')
  const keys = await speaker.evaluate(() => Object.keys(localStorage).filter((k) => k.includes(':rehearsal')))
  expect(keys).toHaveLength(1)
  expect(keys[0]).toMatch(/:rehearsal:cut:short$/)
  // Up to a second on a busy machine between P and the jump is the talk's; the appendix's 3 s are not.
  expect(await speaker.locator('.k-sp-plan-total').textContent()).toMatch(/00:0[01] \/ 10:00$/)
  await context.close()
})

// The overview and the section list tag the appendix with klappe's word, whatever the section is titled.
test('Q from an appendix reached by the section list goes back to the main step it left', async () => {
  const page = await open('', '#/b/two/1', 2)
  await page.keyboard.press('s')
  await page.locator('.k-selector > .k-btn').nth(3).click()
  expect(await at(page)).toBe('#/x/spare/1')
  expect(await press(page, 'q')).toBe('#/b/two/1')
  await page.close()
})

test('the overview and the section list mark the appendix', async () => {
  const page = await open('', '', 0)
  await page.keyboard.press('s')
  expect(await page.locator('.k-selector > .k-btn').allTextContents()).toEqual(['A', 'B', 'C', 'Appendix · Backup'])
  await page.keyboard.press('o')
  expect(await page.locator('.k-ov-caption').allTextContents()).toEqual(['A', 'B', 'C', 'Appendix · Backup'])
  await page.close()
})

test('?cut= plays the cut: next skips the left-out section into the next one, with that section\'s transition', async () => {
  const page = await open('&cut=short', '#/a/one/2', 1)
  const kinds = await page.evaluate(async () => {
    const kinds: string[] = []
    window.klappe.stepper.on('transition', (e: { kind: string }) => kinds.push(e.kind))
    await window.klappe.stepper.next()
    return kinds
  })
  expect(await at(page)).toBe('#/c/three/1')
  expect(kinds).toEqual(['blackout'])
  expect(await page.evaluate(() => window.klappe.steps.map((s: { section: string }) => s.section))).toEqual(['a', 'a', 'c', 'x', 'x'])
  expect(await page.evaluate(() => document.querySelector('[data-scene="two"]'))).toBeNull()
  expect(await page.evaluate(() => window.klappe.problems)).toEqual([])
  await page.close()
})

test('a deep link into a section the cut leaves out is reported and shows the cut\'s first step', async () => {
  const page = await open('&cut=short', '#/b/two/1', 0)
  expect(await at(page)).toBe('#/a/one/1')
  expect(await page.evaluate(() => window.klappe.problems)).toEqual(["#/b: the cut 'short' leaves section 'b' out; showing the cut's first step"])
  await page.close()
})

test('an unknown cut is a deck problem, and the whole deck plays', async () => {
  const page = await open('&cut=nope', '', 0)
  expect(await page.evaluate(() => window.klappe.problems)).toEqual(["cut 'nope': deck.md has no such cut (short, day); playing the whole deck"])
  expect(await page.evaluate(() => window.klappe.steps.length)).toBe(6)
  await page.close()
})

test('the walk is green on the whole deck and on the cut, the appendix included', async () => {
  for (const cut of ['', '&cut=short', '&cut=day']) {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=cuts${cut}`, { w: 1366, h: 768 })
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.checks.some((c) => c.name.startsWith('step #/x/spare/2'))).toBe(true)
    expect(r.checks.some((c) => c.name.startsWith('step #/b/'))).toBe(!cut)
    expect(r.ok).toBe(true)
  }
})

test('a cut plays its sections in its own order and leaves its skipped scenes out', async () => {
  const page = await open('&cut=day', '', 0)
  expect(await at(page)).toBe('#/c/three/1')
  expect(await press(page, 'ArrowRight')).toBe('#/a/one/1')
  expect(await page.evaluate(() => window.klappe.steps.map((s: { section: string }) => s.section))).toEqual(['c', 'a', 'a', 'x', 'x'])
  expect(await page.evaluate(() => window.klappe.problems)).toEqual([])
  await page.close()
})

test('the section list plays a saved cut: the whole deck or a cut, reloaded at its first step', async () => {
  const page = await open('', '#/a/one/2', 1)
  await page.keyboard.press('s')
  const row = page.locator('.k-selector-cuts .k-btn')
  expect(await row.allTextContents()).toEqual(['Whole deck', 'short', 'day'])
  expect(await row.first().getAttribute('aria-pressed')).toBe('true')
  await row.nth(2).click()
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0 && new URL(location.href).searchParams.get('cut') === 'day', undefined, { timeout: 30_000 })
  expect(await at(page)).toBe('#/c/three/1')
  await page.close()
})

// B on the dev server: the deck builder. A saved cut is picked from a drop-down and loaded, changed and saved under a name
// into deck.md, then played.
test('the deck builder loads a saved cut, reorders it and saves it into deck.md, then plays it', async () => {
  const file = `${inject('TEXT_DIR')}/deck.md`
  writeFileSync(file, '---\ntitle: Fixture\nduration: 30\ncuts: { short: { sections: [a, c], duration: 10 } }\n---\n')
  const page = await open('', '#/a/one/1', 0)
  await page.keyboard.press('b')
  const panel = page.locator('.k-builder')
  const sections = () => panel.locator('.k-builder-section > label').allTextContents()
  const checked = () => panel.locator('.k-builder-section input[data-section]:checked').count()
  const all = panel.getByLabel('Select all')
  expect(await sections()).toEqual(['A', 'B', 'C']) // no cut playing: the whole talk, all selected; never the appendix
  expect(await all.isChecked()).toBe(true)
  await panel.getByLabel('Saved cuts').selectOption('short') // picking a cut loads it
  expect(await sections()).toEqual(['A', 'C', 'B']) // the cut's order, then the rest of the talk
  expect(await checked()).toBe(2)
  expect(await panel.getByLabel('Two', { exact: true }).isChecked()).toBe(false) // a left-out section's scenes show off too
  expect(await panel.getByLabel('Cut name').inputValue()).toBe('short')
  expect(await all.evaluate((e: HTMLInputElement) => e.indeterminate)).toBe(true)
  await all.check()
  expect(await checked()).toBe(3)
  await all.uncheck()
  expect(await checked()).toBe(0)
  await panel.getByRole('button', { name: 'Save and play' }).click()
  expect(await panel.locator('.k-builder-status').textContent()).toContain('at least one section')
  await all.check()
  await panel.getByRole('button', { name: 'Move up: C' }).click()
  expect(await sections()).toEqual(['C', 'A', 'B'])
  const name = panel.getByLabel('Cut name')
  await name.fill('')
  await name.pressSequentially('two-days') // typing in the field never steps or opens a panel
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(0)
  await panel.getByRole('button', { name: 'Save and play' }).click()
  await expect.poll(() => readFileSync(file, 'utf8'), { timeout: 10_000 }).toBe(
    '---\ntitle: Fixture\nduration: 30\ncuts: { short: { sections: [a, c], duration: 10 }, two-days: { sections: [c, a, b] } }\n---\n',
  )
  await page.waitForFunction(() => new URL(location.href).searchParams.get('cut') === 'two-days', undefined, { timeout: 30_000 })
  await page.close()
})

// Play beside the drop-down plays the picked cut as saved: no edit, no write.
test('the deck builder plays a saved cut picked from the drop-down', async () => {
  const file = `${inject('TEXT_DIR')}/deck.md`
  const md = '---\ntitle: Fixture\ncuts: { short: [a] }\n---\n'
  writeFileSync(file, md)
  const page = await open('', '#/a/one/1', 0)
  await page.keyboard.press('b')
  const panel = page.locator('.k-builder')
  await panel.getByLabel('Saved cuts').selectOption('day')
  expect(await panel.locator('.k-builder-section > label').allTextContents()).toEqual(['C', 'A', 'B'])
  await panel.getByRole('button', { name: 'Play', exact: true }).click()
  await page.waitForFunction(() => new URL(location.href).searchParams.get('cut') === 'day' && window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  expect(await at(page)).toBe('#/c/three/1')
  expect(readFileSync(file, 'utf8')).toBe(md)
  await page.close()
})

// Sections and their scenes check like a tree: the last scene off takes its section off, a scene on puts it back.
test('the deck builder skips a scene, and its section follows its scenes', async () => {
  const file = `${inject('TEXT_DIR')}/deck.md`
  writeFileSync(file, '---\ntitle: Fixture\n---\n')
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=two-scenes#/a/first/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index === 0, undefined, { timeout: 30_000 })
  await page.keyboard.press('b')
  const panel = page.locator('.k-builder')
  expect(await panel.getByLabel('Saved cuts').isDisabled()).toBe(true) // the deck has no cuts yet
  expect(await panel.getByRole('button', { name: 'Play', exact: true }).isDisabled()).toBe(true)
  const [a, first, second] = ['A', 'First', 'Second'].map((n) => panel.getByLabel(n, { exact: true }))
  await second.uncheck()
  expect(await a.isChecked()).toBe(true)
  expect(await panel.getByLabel('Select all').evaluate((e: HTMLInputElement) => e.indeterminate)).toBe(true)
  await first.uncheck()
  expect(await a.isChecked()).toBe(false)
  await first.check()
  expect(await a.isChecked()).toBe(true)
  await panel.getByLabel('Cut name').fill('short')
  await panel.getByRole('button', { name: 'Save and play' }).click()
  await expect.poll(() => readFileSync(file, 'utf8'), { timeout: 10_000 }).toBe('---\ntitle: Fixture\ncuts: { short: { sections: [a], skip: [a/second] } }\n---\n')
  await page.close()
})
