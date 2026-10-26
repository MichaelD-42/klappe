import { chromium, type BrowserContext, type Page } from '@playwright/test'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, expect, inject, test } from 'vitest'

// The route and the review window share one review file, so they are tested in one file: e2e files run in parallel.
let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())
beforeEach(() => rmSync(inject('REVIEW_FILE'), { force: true }))

const ROUTE = '/__klappe/review'
const order = ['#/a/first/1', '#/a/first/2', '#/a/second/1']

async function open(): Promise<Page> {
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=two-scenes#/a/first/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}
// A request from the deck's page, so from its own origin.
const call = (page: Page, body?: unknown) =>
  page.evaluate(
    async ({ route, body }) => {
      const r = await fetch(route, body ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {})
      return { status: r.status, json: r.ok ? await r.json() : null }
    },
    { route: ROUTE, body },
  )

test('a POST writes the step\'s finding to the review file and returns it', async () => {
  const page = await open()
  const r = await call(page, { hash: '#/a/first/2', quote: 'Step 2.', set: { content: 'Typo.' }, order })
  expect(r.status).toBe(200)
  const disk = readFileSync(inject('REVIEW_FILE'), 'utf8')
  expect(r.json.text).toBe(disk)
  expect(disk).toContain('## #/a/first/2\n\n> Step 2.\n\n### Content\n\nTypo.')
  await page.close()
})

test('a GET returns empty text before the first finding', async () => {
  const page = await open()
  const r = await call(page)
  expect(r.status).toBe(200)
  expect(r.json.text).toBe('')
  expect(typeof r.json.path).toBe('string')
  await page.close()
})

test('a POST from another origin is refused and writes nothing', async () => {
  const r = await fetch(new URL(ROUTE, inject('BASE_URL')), {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: 'http://evil.test' },
    body: JSON.stringify({ hash: '#/a/first/2', quote: 'x', set: { content: 'pwned' }, order }),
  })
  expect(r.status).toBe(403)
  expect(existsSync(inject('REVIEW_FILE'))).toBe(false)
})

test('a malformed body is refused', async () => {
  const page = await open()
  for (const body of [
    { hash: '../../etc', quote: '', set: { content: 'x' }, order },
    { hash: '#/a/first/2', quote: '', set: { content: 7 }, order },
    { hash: '#/a/first/2', quote: '', set: { content: 'x' }, order: 'all' },
  ])
    expect((await call(page, body)).status, JSON.stringify(body)).toBe(400)
  expect(existsSync(inject('REVIEW_FILE'))).toBe(false)
  await page.close()
})

// The deck loads every .md under its folder; a review.md there must not reload the page while the author types.
test('a review.md in the deck folder does not reload the deck', async () => {
  if (!inject('IS_DEMO_DECK')) return
  const file = fileURLToPath(new URL('../../decks/demo/review.md', import.meta.url))
  const page = await browser.newPage()
  try {
    await page.goto(`${inject('BASE_URL')}/#/opening/old-way/1`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await page.evaluate(() => ((window as any).marker = 1))
    writeFileSync(file, '# Review\n\n## #/opening/old-way/1\n\n### Content\n\nA finding.\n')
    await page.waitForTimeout(1500) // a reload would come within this
    writeFileSync(file, '# Review\n')
    await page.waitForTimeout(1500)
    expect(await page.evaluate(() => (window as any).marker)).toBe(1)
  } finally {
    rmSync(file, { force: true })
    await page.close()
  }
})

// The review window: the deck at a deep link, and the window it opens with R, as the author would.
async function pair(hash = '#/a/first/2'): Promise<{ context: BrowserContext; deck: Page; review: Page }> {
  const context = await browser.newContext({ viewport: { width: 1366, height: 768 } })
  const deck = await context.newPage()
  await deck.goto(`${inject('BASE_URL')}/?fixture=two-scenes${hash}`)
  await deck.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const [review] = await Promise.all([context.waitForEvent('page'), deck.keyboard.press('r')])
  await review.waitForSelector('.k-review textarea', { timeout: 30_000 })
  await expect.poll(() => review.locator('.k-rv-place').textContent(), { timeout: 10_000 }).toContain(hash)
  return { context, deck, review }
}
const field = (review: Page, k: string) => review.locator(`textarea[data-k-review="${k}"]`)
const values = (review: Page) => review.evaluate(() => [...document.querySelectorAll('textarea')].map((t) => t.value))
const onDisk = () => (existsSync(inject('REVIEW_FILE')) ? readFileSync(inject('REVIEW_FILE'), 'utf8') : '')
const deckIndex = (deck: Page) => deck.evaluate(() => window.klappe.stepper.index as number)

test('R opens the review window on the deck\'s step, with three empty fields of at least 3.5 lines', async () => {
  const { context, deck, review } = await pair()
  expect(await review.locator('.k-rv-place').textContent()).toContain('2')
  expect(await values(review)).toEqual(['', '', ''])
  for (const k of ['content', 'storytelling', 'visuals']) {
    const fits = await field(review, k).evaluate((t) => t.clientHeight / parseFloat(getComputedStyle(t).lineHeight))
    expect(fits, k).toBeGreaterThanOrEqual(3.5)
  }
  expect(await deck.locator('.k-review').count()).toBe(0) // nothing of review mode in the deck window
  await context.close()
})

test('typing saves to the step and category, without a button', async () => {
  const { context, review } = await pair()
  await field(review, 'visuals').fill('Too dark.')
  await expect.poll(onDisk, { timeout: 10_000 }).toContain('## #/a/first/2\n\n> Step 2.\n\n### Visuals\n\nToo dark.')
  await expect.poll(() => review.locator('.k-rv-status').textContent(), { timeout: 10_000 }).toContain('1')
  await context.close()
})

test('stepping in either window moves both, and each step shows its own findings', async () => {
  const { context, deck, review } = await pair()
  await field(review, 'content').fill('Say it shorter.')
  await review.getByRole('button', { name: 'Next', exact: true }).click()
  await expect.poll(() => deckIndex(deck), { timeout: 10_000 }).toBe(2)
  await expect.poll(() => values(review), { timeout: 10_000 }).toEqual(['', '', ''])
  expect(onDisk()).toContain('Say it shorter.') // a step change saves at once
  await deck.bringToFront()
  await deck.keyboard.press('ArrowLeft')
  await expect.poll(() => values(review), { timeout: 10_000 }).toEqual(['Say it shorter.', '', ''])
  await context.close()
})

test('a finding removed on disk disappears on the next step or focus', async () => {
  const { context, review } = await pair()
  await field(review, 'content').fill('Fixed soon.')
  await expect.poll(onDisk, { timeout: 10_000 }).toContain('Fixed soon.')
  writeFileSync(inject('REVIEW_FILE'), '# Review\n') // what Claude leaves once it is done
  await review.getByRole('button', { name: 'Next', exact: true }).click()
  await review.getByRole('button', { name: 'Previous', exact: true }).click()
  await expect.poll(() => values(review), { timeout: 10_000 }).toEqual(['', '', ''])
  await context.close()
})

test('a field being typed in is not overwritten by a re-read', async () => {
  const { context, review } = await pair()
  await field(review, 'content').click()
  await review.keyboard.type('Mine')
  writeFileSync(inject('REVIEW_FILE'), '# Review\n\n## #/a/first/2\n\n> Step 2.\n\n### Content\n\nTheirs\n')
  await review.evaluate(() => dispatchEvent(new Event('focus')))
  await review.waitForTimeout(300)
  expect(await field(review, 'content').inputValue()).toBe('Mine')
  await context.close()
})

test('an entry whose quote differs from the step text shows "written for"', async () => {
  writeFileSync(inject('REVIEW_FILE'), '# Review\n\n## #/a/first/2\n\n> Old text.\n\n### Visuals\n\nMoved?\n')
  const { context, review } = await pair()
  await expect.poll(() => review.locator('.k-rv-moved').textContent(), { timeout: 10_000 }).toContain('Old text.')
  expect(await field(review, 'visuals').inputValue()).toBe('Moved?')
  await context.close()
})

test('keys typed in a field do not step the deck', async () => {
  const { context, deck, review } = await pair()
  await field(review, 'storytelling').click()
  await review.keyboard.press('Space')
  await review.keyboard.press('Enter')
  await review.keyboard.press('ArrowRight')
  await review.waitForTimeout(500)
  expect(await deckIndex(deck)).toBe(1)
  await context.close()
})
