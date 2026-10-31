import { chromium } from '@playwright/test'
import { expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

test('frame: 9:16 makes a vertical stage: scene frames, the camera and the walk follow it', async () => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=frame`, { w: 1080, h: 1920 })
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems.filter((p) => !p.includes('none.png'))).toEqual([])
  const browser = await chromium.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 540, height: 960 } })
    await page.goto(`${inject('BASE_URL')}/?fixture=frame&instant=1#/a/full/1`)
    await page.waitForFunction(() => window.klappe?.stepper?.index === 2, undefined, { timeout: 30_000 })
    const got = await page.evaluate(() => {
      const box = (s: string) => {
        const b = document.querySelector(s)!.getBoundingClientRect()
        return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }
      }
      return {
        stage: box('.k-stage'),
        scene: box('div[data-scene="full"]'),
        rects: window.klappe.canvases[0].layout.rects,
      }
    })
    expect(got.stage).toEqual({ x: 0, y: 0, w: 540, h: 960 })
    expect(got.scene).toEqual({ x: 0, y: 0, w: 540, h: 960 }) // the camera fills the screen with the scene
    expect(got.rects.full).toEqual({ x: 1080, y: 0, w: 1080, h: 1920 })
    // the overview card has the frame's shape
    await page.keyboard.press('o')
    const card = await page.evaluate(() => {
      const b = document.querySelector('.k-ov-thumb')?.getBoundingClientRect()
      return b ? b.height / b.width : 0
    })
    expect(card).toBeCloseTo(16 / 9, 1)
  } finally {
    await browser.close()
  }
}, 120_000)
