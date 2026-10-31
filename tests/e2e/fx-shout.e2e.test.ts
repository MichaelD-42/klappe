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
        const t = (e.firstElementChild && getComputedStyle(e.firstElementChild).transform) || 'none'
        const scale = t === 'none' ? 1 : new DOMMatrix(t).a // the text box inside the row is the one that scales
        return { opacity: Number(c.opacity), visibility: c.visibility, scale }
      },
      [scene, role, nth] as const,
    )
  } finally {
    await page.close()
  }
}

test('the dim is about 30 % in calm and 70 % in bold once the question has entered', async () => {
  expect((await look('fx-shout', 0, 0, 'dim')).opacity).toBeCloseTo(0.3, 1)
  expect((await look('fx-shout-bold', 0, 0, 'dim')).opacity).toBeCloseTo(0.7, 1)
})

// One click: the enter step ends at the full push-in (1.04 calm, 1.12 bold); no second step grows it.
test('the question reaches full size on the enter step', async () => {
  expect((await look('fx-shout', 0, 0, 'question')).scale).toBeCloseTo(1.04, 2)
  expect((await look('fx-shout-bold', 0, 0, 'question')).scale).toBeCloseTo(1.12, 2)
})

test('the vignette shows only in bold', async () => {
  expect((await look('fx-shout', 0, 0, 'vignette')).visibility).toBe('hidden')
  const v = await look('fx-shout-bold', 0, 0, 'vignette')
  expect(v.visibility).toBe('visible')
  expect(v.opacity).toBeCloseTo(1, 1)
})

// A shout-out is two steps: the question, then the answer. Scene 3 has two (roots 2 and 3): steps 4-5 are the first, 6-7 the second.
for (const fixture of ['fx-shout', 'fx-shout-bold'])
  test(`${fixture}: the first answer is gone once the second question has entered`, async () => {
    expect((await look(fixture, 5, 2, 'answer', 0)).visibility).toBe('visible')
    expect((await look(fixture, 6, 2, 'answer', 0)).visibility).toBe('hidden')
    expect((await look(fixture, 6, 3, 'question')).visibility).toBe('visible')
  })

// The second click lifts the question and the dim and shows the answer: no blank beat between them.
for (const fixture of ['fx-shout', 'fx-shout-bold'])
  test(`${fixture}: the answer follows the question on the next step`, async () => {
    expect((await look(fixture, 1, 0, 'question')).visibility).toBe('hidden')
    expect((await look(fixture, 1, 0, 'answer')).visibility).toBe('visible')
    expect((await look(fixture, 1, 0, 'dim')).visibility).toBe('hidden')
  })

// The pause beat stays in scene.ts (h.fade): steps 8-10 of the bold fixture.
test('bold keeps a faint trace of the question on the fade step', async () => {
  const bold = await look('fx-shout-bold', 9, 4, 'question')
  expect(bold.opacity).toBeGreaterThan(0.05)
  expect(bold.opacity).toBeLessThan(0.3)
})
