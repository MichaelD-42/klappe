import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { exportPdf } from '../../bin/pdf.mjs'
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

// The JPEG each PDF page shows. Skia writes one image per distinct screenshot and lets identical pages
// share it, so each page is followed from /Pages /Kids to its /XObject.
function pageImages(pdf: Buffer): Buffer[] {
  const s = pdf.toString('latin1')
  const obj = (n: string) => {
    const m = new RegExp(String.raw`(?:^|\s)${n} 0 obj\s*`).exec(s)!
    return { at: m.index + m[0].length, body: s.slice(m.index + m[0].length, s.indexOf('endobj', m.index)) }
  }
  const kids = [.../\/Kids\s*\[([^\]]*)\]/.exec(s)![1].matchAll(/(\d+) 0 R/g)].map((m) => m[1])
  return kids.map((k) => {
    const img = obj(/\/XObject\s*<<\s*\/\w+\s+(\d+) 0 R/.exec(obj(k).body)![1])
    const len = Number(/\/Length (\d+)/.exec(img.body)![1])
    const start = s.indexOf('stream', img.at) + 'stream'.length
    const from = start + (s[start] === '\r' ? 2 : 1)
    return pdf.subarray(from, from + len)
  })
}

test('the PDF export shows the side each step leaves: front, back, front', async () => {
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'klappe-pdf-')), 'deck.pdf')
  try {
    const r = await exportPdf(`${inject('BASE_URL')}/?fixture=fx-flipcard`, out)
    expect(r).toEqual({ pages: 3, problems: [], errors: [] })
    const page = await browser.newPage()
    // The mean colour of the 40x40 square at the stage centre, where the fixture puts an --k-accent block on the back.
    const centre = (jpeg: Buffer) =>
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
      }, `data:image/jpeg;base64,${jpeg.toString('base64')}`)
    // calm's --k-accent: fixtures keep the klappe look.
    const hex = /--k-accent:\s*#([0-9a-f]{6})/i.exec(fs.readFileSync(new URL('../../src/themes/calm.css', import.meta.url), 'utf8'))![1]
    const accent = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
    const isAccent = async (jpeg: Buffer) => (await centre(jpeg)).every((v, k) => Math.abs(v - accent[k]) < 12)
    const shows = await Promise.all(pageImages(fs.readFileSync(out)).map(isAccent))
    expect(shows).toEqual([false, true, false])
    await page.close()
  } finally {
    fs.rmSync(path.dirname(out), { recursive: true })
  }
}, 120_000)
