import { chromium } from '@playwright/test'
import { createRequire } from 'node:module'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest, settle } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const TOO_LONG = 'qr: the text is too long for a QR code (8000 characters)'
const JSQR = createRequire(import.meta.url).resolve('jsqr/dist/jsQR.js')

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])
  test(`walk: play equals seek at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-qr`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([TOO_LONG])
  }, 120_000)

// A phone must read it: a screenshot of the code, decoded with jsQR, gives the link back.
for (const [w, h, theme] of [
  [1920, 1080, 'calm'],
  [1366, 768, 'bold'],
] as const)
  test(`the code scans back to the link at ${w}x${h} (${theme})`, async () => {
    const page = await browser.newPage({ viewport: { width: w, height: h } })
    await page.goto(`${inject('BASE_URL')}/?fixture=fx-qr&theme=${theme}#/a/link/1`)
    await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
    await settle(page)
    await page.addScriptTag({ path: JSQR })
    const box = (await page.locator('[data-scene="link"] [data-k-qr] svg').boundingBox())!
    const png = (await page.screenshot({ clip: box })).toString('base64')
    const text = await page.evaluate(async (b64) => {
      const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${b64}`)).blob())
      const c = new OffscreenCanvas(img.width, img.height).getContext('2d')!
      c.drawImage(img, 0, 0)
      const d = c.getImageData(0, 0, img.width, img.height)
      return (window as any).jsQR(d.data, d.width, d.height)?.data ?? null
    }, png)
    expect(text).toBe('https://klappe.test/talk?id=42')
    await page.close()
  }, 60_000)
