import { chromium, type Page } from '@playwright/test'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, beforeEach, expect, inject, test } from 'vitest'

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
