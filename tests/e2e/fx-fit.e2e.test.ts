import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// Text that fits at no size is a deck problem; the rest shrinks into its box and walks clean.
test('text that does not fit at 20 px is a deck problem in each element', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-fit`, { w: 1920, h: 1080 })
  expect(r.errors).toEqual([])
  expect(r.problems).toEqual([
    'sections/10-a/10-flip/scene.ts step 1: flipCard: text of the back too long',
    'sections/10-a/20-stack/scene.ts step 1: cardStack: text of card 2 too long',
    'sections/10-a/30-sets/scene.ts step 1: venn: name of set "b" too long',
    'sections/10-a/30-sets/scene.ts step 1: venn: label of region "a+b" too long',
    'sections/10-a/40-grid/scene.ts step 1: matrix: y axis title too long',
  ])
}, 120_000)

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-fit#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

test('a long card text shrinks below 40 px, not below 20, and stays inside its face', async () => {
  const page = await open('/a/flip/2')
  const r = await page.evaluate(() => {
    const back = document.querySelector<HTMLElement>('[data-k-flipcard-back]')!
    const text = back.firstElementChild as HTMLElement
    return { size: parseFloat(getComputedStyle(text).fontSize), over: text.offsetHeight > back.clientHeight || text.scrollWidth > back.clientWidth }
  })
  expect(r.size).toBeLessThan(40)
  expect(r.size).toBeGreaterThanOrEqual(20)
  expect(r.over).toBe(false)
  await page.close()
})

test('a short text keeps its size', async () => {
  const page = await open('/a/sets/2')
  const sizes = await page.evaluate(() => ({
    card: parseFloat(getComputedStyle(document.querySelector('[data-k-card="0"]')!).fontSize),
    region: parseFloat(getComputedStyle(document.querySelector('[data-k-venn-label="a"]')!).fontSize),
  }))
  expect(sizes).toEqual({ card: 32, region: 22 })
  await page.close()
})
