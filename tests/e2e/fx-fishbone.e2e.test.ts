import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-fishbone&instant=1#${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.waitForTimeout(300)
  return page
}
// Per bone: its category label shown, its line drawn, it is lit.
const bones = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('[data-k-bone]')].map((g) => {
      const [line, tag, hot] = [g.children[0] as SVGElement, g.children[1], g.children[2]]
      return { shown: +getComputedStyle(tag).opacity > 0.9, drawn: +getComputedStyle(line).strokeDashoffset.replace('px', '') < 0.01, lit: +getComputedStyle(hot).opacity > 0.9 }
    }),
  )

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk: a fishbone builds as it seeks at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-fishbone`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([
      'sections/10-a/10-bones/scene.ts step 4: fishbone: light(3) before cause 3 is built (2 built)',
      'sections/10-a/10-bones/scene.ts step 8: fishbone: next() past the last cause (4 causes)',
    ])
  })

test('bones build one per step in order, whichever adder was made first; light moves the accent between built bones', async () => {
  const page = await open('/a/bones/2')
  expect((await bones(page)).map((b) => b.shown && b.drawn)).toEqual([true, false, false, false])
  await page.evaluate(() => window.klappe.stepper.goto(4, 'cut'))
  await page.waitForTimeout(300)
  expect((await bones(page)).map((b) => b.shown && b.drawn)).toEqual([true, true, true, true])
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(300)
  expect((await bones(page)).map((b) => b.lit)).toEqual([false, true, false, false])
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(300)
  expect((await bones(page)).map((b) => b.lit)).toEqual([false, false, false, true])
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(300)
  expect((await bones(page)).map((b) => b.lit)).toEqual([false, false, false, false])
  await page.close()
})
