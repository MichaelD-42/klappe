import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-state`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual(['flow: no edge from "done" to "idle"'])
  }, 120_000)

// After each fire exactly one state is ringed, the one fired into.
test('fire moves the ring to the state it fires into', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  const ringed = async (step: number) => {
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-state#/a/machine/${step}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await page.waitForTimeout(500)
    return page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('[data-k-flow-node]')]
        .filter((n) => +getComputedStyle(n.lastElementChild!).opacity > 0.9)
        .map((n) => n.dataset.kFlowNode),
    )
  }
  expect(await ringed(1)).toEqual(['idle'])
  expect(await ringed(2)).toEqual(['run'])
  expect(await ringed(4)).toEqual(['fail'])
  expect(await ringed(7)).toEqual(['done'])
  await page.close()
}, 60_000)
