import { chromium } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const STRAY = 'focus: the item is not in the list'

// Reduced motion too: the fade stays, so it must leave the same states.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-focus${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([STRAY])
  }, 120_000)

// The three boxes' opacity after a deep link to a step, and whether anything was added over the scene.
async function look(hash: string, query = '') {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-focus${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  const scene = hash.split('/')[2]
  const r = await page.evaluate((scene) => {
    const s = document.querySelector(`div[data-scene="${scene}"]`)!
    const boxes = [...s.querySelectorAll<HTMLElement>(':scope > div')].filter((d) => /^Box \d$/.test(d.textContent!))
    return { ops: boxes.map((b) => Number(getComputedStyle(b).opacity)), others: s.querySelectorAll(':scope > div').length - boxes.length }
  }, scene)
  await page.close()
  return r
}

test('on lights one box and dims the rest, the next on moves it, clear brings all back', async () => {
  expect((await look('#/a/walk/1')).ops).toEqual([1, 1, 1])
  expect(await look('#/a/walk/2')).toEqual({ ops: [1, 0.35, 0.35], others: 0 }) // no layer of its own
  expect((await look('#/a/walk/3')).ops).toEqual([0.35, 1, 0.35])
  expect((await look('#/a/walk/4')).ops).toEqual([0.35, 0.35, 1])
  expect((await look('#/a/walk/5')).ops).toEqual([1, 1, 1])
}, 60_000)

test('adders built out of step order still move the focus in step order', async () => {
  expect((await look('#/a/early/2')).ops).toEqual([1, 0.35, 0.35])
  expect((await look('#/a/early/3')).ops).toEqual([0.35, 0.35, 1])
}, 60_000)

test('with reduced motion the states are the same', async () => {
  expect((await look('#/a/walk/3', '&reducedmotion=1')).ops).toEqual([0.35, 1, 0.35])
}, 60_000)
