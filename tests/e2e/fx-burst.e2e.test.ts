import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(url: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/${url}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`fx-burst walk passes at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-burst`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.ok).toBe(true)
  })

test('the burst canvas sits under data-k-ignore in the world, empty before and after its pop', async () => {
  const page = await open('?fixture=fx-burst#/a/pop/1')
  const r = await page.evaluate(() => {
    const [c] = document.querySelectorAll<HTMLCanvasElement>('canvas[data-k-burst]')
    const blank = (x: HTMLCanvasElement) => !x.getContext('2d')!.getImageData(0, 0, x.width, x.height).data.some((v) => v > 0)
    return { inWorld: !!c.closest('.k-world'), ignored: c.matches('[data-k-ignore]'), progress: c.getAttribute('data-k-progress'), blank: blank(c) }
  })
  expect(r).toEqual({ inWorld: true, ignored: true, progress: '1', blank: true })
  await page.close()
})

// The self-test skips data-k-ignore, so this proves seek equals play: mid-pop, the same pixels from either side.
test('mid-pop, a seek from the start and a seek from the end draw the same pixels', async () => {
  const page = await open('?fixture=fx-burst')
  const r = await page.evaluate(() => {
    const tl = window.klappe.canvases[0].tl
    const [c] = document.querySelectorAll<HTMLCanvasElement>('canvas[data-k-burst]')
    const mid = tl.labels['e:0'] / 2
    tl.pause()
    tl.seek(0, false)
    tl.seek(mid, false)
    const a = c.toDataURL()
    const progress = Number(c.getAttribute('data-k-progress'))
    const lit = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.filter((v, k) => k % 4 === 3 && v > 0).length
    tl.seek(tl.labels['e:1'], false)
    tl.seek(mid, false)
    return { same: c.toDataURL() === a, progress, lit }
  })
  expect(r.same).toBe(true)
  expect(r.progress).toBeGreaterThan(0)
  expect(r.progress).toBeLessThan(1)
  expect(r.lit).toBeGreaterThan(1000)
  await page.close()
})

test('with reduced motion there is no burst; the step still shows its label', async () => {
  const page = await open('?fixture=fx-burst&reducedmotion=1#/a/pop/1')
  const r = await page.evaluate(() => ({
    canvases: document.querySelectorAll('canvas[data-k-burst]').length,
    label: [...document.querySelectorAll<HTMLElement>('div')].find((d) => d.textContent === 'Milestone reached')!.style.visibility,
  }))
  expect(r).toEqual({ canvases: 0, label: 'inherit' })
  await page.close()
})
