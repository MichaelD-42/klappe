import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

async function open(hash: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-shatter${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

// Shard wrappers that show: each holds a clip-path div.
const visibleShards = (page: Page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll<HTMLElement>('[style*="clip-path"]')].filter((e) =>
        e.parentElement!.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
      ).length,
  )

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`walk passes on fx-shatter at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-shatter`, vp)
    expect(r.errors).toEqual([])
    expect(r.problems).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.ok).toBe(true)
  })

test('frame time of the fall step at real speed (reported, not asserted)', async () => {
  const page = await open('#/a/default/3')
  const r = await page.evaluate(async () => {
    const dts: number[] = []
    let last = performance.now()
    let on = true
    const tick = (t: number) => {
      dts.push(t - last)
      last = t
      if (on) requestAnimationFrame(tick)
    }
    requestAnimationFrame((t) => {
      last = t
      requestAnimationFrame(tick)
    })
    await window.klappe.stepper.next()
    on = false
    dts.sort((a, b) => a - b)
    return { frames: dts.length, avg: dts.reduce((s, d) => s + d, 0) / dts.length, p95: dts[Math.floor(dts.length * 0.95)] }
  })
  console.log(`shatter fall frame time: ${r.frames} frames, avg ${r.avg.toFixed(1)} ms, p95 ${r.p95.toFixed(1)} ms`)
  expect(r.frames).toBeGreaterThan(0)
  await page.close()
})

test('back across the shatter step leaves no shard visible', async () => {
  const page = await open('#/a/default/3')
  await page.evaluate(() => window.klappe.stepper.next())
  await page.evaluate(() => {
    const c = window.klappe.canvases[0]
    c.tl.seek(c.tl.time() - 1, false) // mid-fall: shards show
  })
  expect(await visibleShards(page)).toBeGreaterThan(0)
  await page.evaluate(() => window.klappe.stepper.prev())
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(2)
  expect(await visibleShards(page)).toBe(0)
  await page.close()
})

// The swap from the original to its shards must not jump: the shards show the live frame,
// with the count written from onUpdate and without the line faded out a step before.
test('the shards show the target exactly as it was right before the swap', async () => {
  const page = await open('#/a/live/3')
  const r = await page.evaluate(() => {
    const c = window.klappe.canvases[0]
    const t = c.tl.labels['e:14'] // end of the crack step; the fall starts 0.021 s later
    const look = (e: HTMLElement) => {
      const b = e.getBoundingClientRect()
      return { text: e.innerText, box: [b.left, b.top, b.width, b.height].map(Math.round), shown: e.checkVisibility({ opacityProperty: true, visibilityProperty: true }) }
    }
    c.tl.seek(t, false)
    const [original] = document.querySelectorAll<HTMLElement>('.fx-live')
    const before = look(original)
    c.tl.seek(t + 0.025, false)
    const copies = [...document.querySelectorAll<HTMLElement>('.fx-live')].slice(1)
    return { before, original: look(original), copies: copies.map(look) }
  })
  expect(r.before.shown).toBe(true)
  expect(r.before.text).toContain('Count 42')
  expect(r.before.text).not.toContain('fades out')
  expect(r.original.shown).toBe(false)
  expect(r.copies.length).toBeGreaterThan(20)
  for (const c of r.copies) {
    expect(c.shown).toBe(true)
    expect(c.text).toBe(r.before.text)
    c.box.forEach((v, k) => expect(Math.abs(v - r.before.box[k])).toBeLessThanOrEqual(3))
  }
  await page.close()
})

test('back across the shatter transition leaves no shard visible', async () => {
  const page = await open('#/a/last/1')
  const kinds: string[] = await page.evaluate(async () => {
    const seen: string[] = []
    window.klappe.stepper.on('transition', (e: { kind: string }) => seen.push(e.kind))
    await window.klappe.stepper.next()
    return seen
  })
  expect(kinds).toEqual(['shatter'])
  // The old frame holds a video; the shards show a still box, not one player each.
  expect(await page.evaluate(() => document.querySelectorAll('[data-scene$="last"] video').length)).toBe(1)
  expect(await page.evaluate(() => document.querySelectorAll('[data-k-shatter] :is(video, iframe)').length)).toBe(0)
  expect(await page.evaluate(() => window.klappe.errors)).toEqual([])
  expect(await visibleShards(page)).toBe(0)
  expect(await page.evaluate(() => window.klappe.stepper.index)).toBe(17)
  await page.evaluate(() => window.klappe.stepper.prev())
  expect(await visibleShards(page)).toBe(0)
  await page.close()
})
