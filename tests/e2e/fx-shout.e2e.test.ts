import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

for (const fixture of ['fx-shout', 'fx-shout-bold'])
  for (const vp of [
    { w: 1920, h: 1080 },
    { w: 1366, h: 768 },
    { w: 1024, h: 768 },
  ])
    test(`${fixture} walks clean at ${vp.w}x${vp.h}`, async () => {
      const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=${fixture}`, vp)
      expect(r.errors).toEqual([])
      expect(r.problems).toEqual([])
      expect(r.checks.filter((c) => !c.ok)).toEqual([])
      expect(r.ok).toBe(true)
    })

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

// Computed style of a shout part in the `scene`th shout root (0-based; each shout has one), at step `step` (a cut).
async function look(fixture: string, step: number, scene: number, role: string, nth = 0) {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  try {
    await page.goto(`${inject('BASE_URL')}/?fixture=${fixture}`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await page.evaluate((i) => window.klappe.stepper.goto(i, 'cut'), step)
    return await page.evaluate(
      ([s, r, n]) => {
        const root = document.querySelectorAll('[data-k-shout="root"]')[s as number]
        const e = root.querySelectorAll<HTMLElement>(`[data-k-shout="${r}"]`)[n as number]
        const c = getComputedStyle(e)
        return { opacity: Number(c.opacity), visibility: c.visibility }
      },
      [scene, role, nth] as const,
    )
  } finally {
    await page.close()
  }
}

test('the dim is about 30 % in calm and 70 % in bold at the end of the hold', async () => {
  expect((await look('fx-shout', 1, 0, 'dim')).opacity).toBeCloseTo(0.3, 1)
  expect((await look('fx-shout-bold', 1, 0, 'dim')).opacity).toBeCloseTo(0.7, 1)
})

test('the vignette shows only in bold', async () => {
  expect((await look('fx-shout', 1, 0, 'vignette')).visibility).toBe('hidden')
  const v = await look('fx-shout-bold', 1, 0, 'vignette')
  expect(v.visibility).toBe('visible')
  expect(v.opacity).toBeCloseTo(1, 1)
})

// Scene 3 has two shout-outs (roots 2 and 3): steps 8-11 are the first, 12-15 the second.
for (const fixture of ['fx-shout', 'fx-shout-bold'])
  test(`${fixture}: the first answer is gone once the second question has entered`, async () => {
    expect((await look(fixture, 11, 2, 'answer', 0)).visibility).toBe('visible')
    expect((await look(fixture, 12, 2, 'answer', 0)).visibility).toBe('hidden')
    expect((await look(fixture, 12, 3, 'question')).visibility).toBe('visible')
  })

test('bold keeps a faint trace of the question after the fade; calm clears it', async () => {
  const bold = await look('fx-shout-bold', 2, 0, 'question')
  expect(bold.opacity).toBeGreaterThan(0.05)
  expect(bold.opacity).toBeLessThan(0.3)
  expect((await look('fx-shout', 2, 0, 'question')).visibility).toBe('hidden')
})
