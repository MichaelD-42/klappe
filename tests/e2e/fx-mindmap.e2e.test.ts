import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-mindmap&instant=1#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: a mind map grows as it seeks at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-mindmap`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['sections/10-a/10-grow/scene.ts step 6: mindMap: next() past the last branch (4 branches)'])
  })

test('branches grow one per step in order, with their sub-branches, whichever adder was made first', async () => {
  const page = await open('/a/grow/2')
  const shown = () => page.evaluate(() =>
    [...document.querySelectorAll('[data-k-mind-branch]')].map((g) => +getComputedStyle(g).opacity > 0.9),
  )
  const texts = () => page.evaluate(() =>
    [...document.querySelectorAll('[data-k-mindmap] [data-k-mind-light] > g > text')].filter((t) => +getComputedStyle(t).opacity > 0.9).map((t) => t.textContent),
  )
  expect(await shown()).toEqual([true, false, false, false])
  expect(await texts()).toEqual(['Buddy', 'Team lunch'])
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(300)
  expect(await shown()).toEqual([true, true, false, false])
  expect(await texts()).toEqual(['Buddy', 'Team lunch', 'Laptop', 'Accounts', 'VPN'])
  await page.close()
})

test('every label of the full map sits inside the rect and no two overlap', async () => {
  const page = await open('/a/grow/5')
  const boxes = await page.evaluate(() => {
    const stage = document.querySelector('.k-stage')!.getBoundingClientRect()
    const s = stage.width / 1920
    return [...document.querySelectorAll('[data-k-mindmap] text')].map((t) => {
      const r = t.getBoundingClientRect()
      return { t: t.textContent, x0: (r.left - stage.left) / s, x1: (r.right - stage.left) / s, y0: (r.top - stage.top) / s, y1: (r.bottom - stage.top) / s }
    })
  })
  expect(boxes.length).toBe(14)
  for (const b of boxes) {
    expect(b.x0, b.t!).toBeGreaterThanOrEqual(160)
    expect(b.x1, b.t!).toBeLessThanOrEqual(1760)
  }
  for (let i = 0; i < boxes.length; i++)
    for (let j = i + 1; j < boxes.length; j++) {
      const [a, b] = [boxes[i], boxes[j]]
      expect(a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1, `${a.t} / ${b.t}`).toBe(false)
    }
  await page.close()
})
