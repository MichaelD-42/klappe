import fs from 'node:fs'
import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { openDeck, showStep } from '../../bin/pdf.mjs'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

// Reduced motion too: the faces crossfade instead of turning.
for (const [vp, q] of [
  [{ w: 1920, h: 1080 }, ''],
  [{ w: 1366, h: 768 }, ''],
  [{ w: 1920, h: 1080 }, '&reducedmotion=1'],
] as const)
  test(`walk: play equals seek at ${vp.w}x${vp.h}${q}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-flipcard${q}`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([])
  }, 120_000)

async function open(hash: string, query = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-flipcard${query}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await settle(page)
  return page
}

// Which face is painted at the card's centre (hit testing skips a hidden backface and visibility: hidden),
// and the cosine of the card's turn (1 front on, -1 back on).
const side = (page: Page) =>
  page.evaluate(() => {
    const root = document.querySelector('[data-k-flipcard]')!
    const r = root.getBoundingClientRect()
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + 40)
    const face = hit?.closest('[data-k-flipcard-front]') ? 'front' : hit?.closest('[data-k-flipcard-back]') ? 'back' : 'none'
    return { face, cos: Math.round(new DOMMatrix(getComputedStyle(root.firstElementChild!).transform).m11 * 100) / 100 }
  })

test('the card turns to its back, then to its front again', async () => {
  for (const [hash, want] of [['#/a/cards/1', { face: 'front', cos: 1 }], ['#/a/cards/2', { face: 'back', cos: -1 }], ['#/a/cards/3', { face: 'front', cos: 1 }]] as const) {
    const page = await open(hash)
    expect(await side(page)).toEqual(want)
    await page.close()
  }
}, 60_000)

test('mid-flip the card is turned on its edge, not cut', async () => {
  const page = await open('#/a/cards/1')
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(450)
  expect(Math.abs((await side(page)).cos)).toBeLessThan(0.9)
  await page.close()
}, 60_000)

test('with reduced motion the faces crossfade and the card never turns', async () => {
  for (const [hash, face] of [['#/a/cards/2', 'back'], ['#/a/cards/3', 'front']] as const) {
    const page = await open(hash, '&reducedmotion=1')
    expect(await side(page)).toEqual({ face, cos: 1 })
    await page.close()
  }
}, 60_000)

// The print path (openDeck and showStep, as klappe pdf and shot use them) shows the side each step leaves.
test('a printed step shows the side it leaves: front, back, front', async () => {
  const page = await openDeck(browser, `${inject('BASE_URL')}/?fixture=fx-flipcard`)
  // The mean colour of the 40x40 square at the stage centre, where the fixture puts an --k-accent block on the back.
  const centre = async () =>
    page.evaluate(async (src) => {
      const img = new Image()
      img.src = src
      await img.decode()
      const c = new OffscreenCanvas(img.width, img.height).getContext('2d')!
      c.drawImage(img, 0, 0)
      const d = c.getImageData(img.width / 2 - 20, img.height / 2 - 20, 40, 40).data
      const sum = [0, 0, 0]
      for (let i = 0; i < d.length; i += 4) for (let k = 0; k < 3; k++) sum[k] += d[i + k]
      return sum.map((v) => v / (d.length / 4))
    }, `data:image/jpeg;base64,${(await page.screenshot({ type: 'jpeg', quality: 90 })).toString('base64')}`)
  // calm's --k-accent: fixtures keep the klappe look.
  const hex = /--k-accent:\s*#([0-9a-f]{6})/i.exec(fs.readFileSync(new URL('../../src/themes/calm.css', import.meta.url), 'utf8'))![1]
  const accent = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const shows = []
  for (const i of [0, 1, 2]) {
    await showStep(page, i)
    shows.push((await centre()).every((v, k) => Math.abs(v - accent[k]) < 12))
  }
  expect(shows).toEqual([false, true, false])
  await page.close()
}, 120_000)
