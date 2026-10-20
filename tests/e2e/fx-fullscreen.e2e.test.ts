import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

const MISSING = 'IMAGE MISSING: media/sunrise.png — A sunrise over a mountain ridge'
const MISSING_BG = 'sections/20-b/30-no-sky/scene.md: background: IMAGE MISSING: media/harbour.png — A harbour at night'

async function open(hash: string, vp = { width: 1366, height: 768 }, flags = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: vp })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-fullscreen${flags}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`full-screen fixture walks clean at ${vp.w}x${vp.h}, but for the missing cover and background`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-fullscreen`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([MISSING, MISSING_BG]) // so r.ok is false by design
  }, 120_000)

const scale = (page: Page) =>
  page.evaluate(() => {
    const img = document.querySelector<HTMLImageElement>('[data-scene$="ken-burns"] img')!
    return { scale: new DOMMatrix(getComputedStyle(img).transform).a, transform: img.style.transform }
  })

test('Ken Burns pushes in while the step plays and lands where a seek lands', async () => {
  const page = await open('#/a/ken-burns/1')
  const seek = await scale(page)
  expect(seek.scale).toBeCloseTo(1.08, 3)
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.stepper.index - 1, 'cut'))
  expect((await scale(page)).scale).toBe(1)
  const done = page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(2500)
  const mid = (await scale(page)).scale
  expect(mid).toBeGreaterThan(1)
  expect(mid).toBeLessThan(1.08)
  await done
  expect(await scale(page)).toEqual(seek)
  await page.close()
}, 30_000)

test('reduced motion leaves the Ken Burns push out', async () => {
  const page = await open('#/a/ken-burns/1', undefined, '&reducedmotion=1')
  expect((await scale(page)).scale).toBe(1)
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.stepper.index - 1, 'cut'))
  await page.evaluate(() => window.klappe.stepper.next())
  expect((await scale(page)).scale).toBe(1)
  await page.close()
}, 30_000)

test('a full-frame cover shows while the camera flies into its scene, not after', async () => {
  const page = await open('#/a/cover/1')
  const state = () =>
    page.evaluate(() => {
      const box = document.querySelector('[data-scene$="ken-burns"] img')!.parentElement!
      return { opacity: Number(getComputedStyle(box).opacity), camera: getComputedStyle(box.closest('.k-world')!).transform }
    })
  const before = (await state()).camera
  const move = page.evaluate(() => window.klappe.stepper.next())
  await page.waitForTimeout(500)
  const mid = await state()
  expect(mid.opacity).toBeGreaterThan(0)
  expect(mid.camera).not.toBe(before)
  await move
  const end = await state()
  expect(end.camera).not.toBe(mid.camera) // the camera was still on its way at the mid check
  await page.close()
}, 30_000)

// WCAG contrast of two relative luminances.
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

// The pictures behind both have white dots under the text: the worst case for a flat scrim.
for (const [hash, sel] of [
  ['#/a/scrim/1', '[data-scene$="scrim"] h2, [data-scene$="scrim"] p'],
  ['#/b/first/1', '[data-scene$="first"] h2, [data-scene$="first"] p[data-step="1"]'],
])
test(`text over the scrim at ${hash} is at least 14 px at 1366 and keeps 4.5:1 against the brightest pixel behind it`, async () => {
  const page = await open(hash)
  const boxes = await page.$$eval(sel, (es) =>
    es.map((e) => {
      const r = e.getBoundingClientRect()
      const w = document.querySelector<HTMLElement>('.k-stage')?.getBoundingClientRect().width ?? innerWidth
      return { x: r.x, y: r.y, width: r.width, height: r.height, px: (parseFloat(getComputedStyle(e).fontSize) * w) / 1920, color: getComputedStyle(e).color }
    }),
  )
  expect(boxes).toHaveLength(2)
  // Hide the text and read the picture behind it: the brightest pixel is the worst case.
  await page.addStyleTag({ content: `${sel} { color: transparent !important }` })
  for (const b of boxes) {
    expect(b.px).toBeGreaterThanOrEqual(14)
    const png = (await page.screenshot({ clip: { x: b.x, y: b.y, width: b.width, height: b.height } })).toString('base64')
    const [bg, fg] = await page.evaluate(
      async ([png, color]) => {
        const lum = (r: number, g: number, b: number) => {
          const f = (c: number) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        const img = await createImageBitmap(await (await fetch(`data:image/png;base64,${png}`)).blob())
        const c = new OffscreenCanvas(img.width, img.height).getContext('2d')!
        c.drawImage(img, 0, 0)
        const d = c.getImageData(0, 0, img.width, img.height).data
        let max = 0
        for (let i = 0; i < d.length; i += 4) max = Math.max(max, lum(d[i], d[i + 1], d[i + 2]))
        const [r, g, b] = color.match(/\d+/g)!.map(Number)
        return [max, lum(r, g, b)]
      },
      [png, b.color] as const,
    )
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5)
  }
  await page.close()
}, 30_000)

test('a plain heading built after a cover picture paints on top of it', async () => {
  const page = await open('#/a/cover/1')
  const onTop = await page.evaluate(() => {
    const h2 = document.querySelector<HTMLElement>('[data-scene$="cover"] h2')!
    const r = h2.getBoundingClientRect()
    return h2.contains(document.elementFromPoint(r.x + 20, r.y + r.height / 2))
  })
  expect(onTop).toBe(true)
  await page.close()
}, 30_000)

test('a missing cover fills the frame with IMAGE MISSING, its alt text and a prompt, and records a problem', async () => {
  const page = await open('#/a/missing/1')
  const r = await page.evaluate(() => {
    const b = [...document.querySelectorAll<HTMLElement>('[data-scene$="missing"] div')].find((e) => e.textContent?.startsWith('IMAGE MISSING'))!
    return { text: b.textContent, w: b.offsetWidth, h: b.offsetHeight, shown: b.checkVisibility({ opacityProperty: true, visibilityProperty: true }) }
  })
  expect(r).toMatchObject({ w: 1920, h: 1080, shown: true })
  expect(r.text).toContain('A sunrise over a mountain ridge')
  expect(r.text).toContain('A sunrise over a mountain ridge, 16:9, 1920x1080, no text, no logos')
  expect(await page.evaluate(() => window.klappe.problems)).toContain(MISSING)
  await page.close()
})

// A pinned background by id (scene id for a scene's own, section id for the section's), or every shown one.
const backgrounds = (page: Page, id?: string) =>
  page.evaluate((id) => {
    const s = document.querySelector('.k-stage')!.getBoundingClientRect()
    return [...document.querySelectorAll<HTMLElement>('[data-k-background]')]
      .filter((bg) => (id ? bg.dataset.kBackground === id : bg.checkVisibility({ opacityProperty: true, visibilityProperty: true })))
      .map((bg) => {
        const img = bg.querySelector('img')
        const b = bg.getBoundingClientRect()
        return {
          id: bg.dataset.kBackground,
          src: img?.src ?? null,
          shown: bg.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
          opacity: Number(getComputedStyle(bg).opacity),
          transform: img ? getComputedStyle(img).transform : null,
          scale: img ? new DOMMatrix(getComputedStyle(img).transform).a : null,
          covers: b.left <= s.left + 1 && b.top <= s.top + 1 && b.right >= s.right - 1 && b.bottom >= s.bottom - 1,
          inWorld: !!bg.closest('.k-world'),
          text: bg.textContent,
        }
      })
  }, id)
const background = async (page: Page, id: string) => (await backgrounds(page, id))[0]
const camera = (page: Page) => page.evaluate(() => getComputedStyle(document.querySelectorAll('.k-world')[1]).transform)

test('a section background stays behind the text through the canvas transition and the camera move', async () => {
  const page = await open('#/a/missing/1')
  // The text on top at its centre.
  const onTop = (scene: string) =>
    page.evaluate((scene) => {
      const h2 = document.querySelector<HTMLElement>(`[data-scene$="${scene}"] h2`)!
      const r = h2.getBoundingClientRect()
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return !!top && h2.contains(top)
    }, scene)
  const move = page.evaluate(() => window.klappe.stepper.next()) // fade into section B's canvas
  await page.waitForTimeout(250)
  const canvas = await page.evaluate(() => Number(getComputedStyle(document.querySelectorAll('.k-canvas')[1]).opacity))
  expect(canvas).toBeGreaterThan(0)
  expect(canvas).toBeLessThan(1)
  expect(await background(page, 'b')).toMatchObject({ shown: true, opacity: 1 }) // it fades with its canvas
  await move
  expect(await onTop('first')).toBe(true)
  expect(await background(page, 'b')).toMatchObject({ shown: true, covers: true, inWorld: false })
  await page.evaluate(async () => {
    await window.klappe.stepper.next()
    await window.klappe.stepper.next() // the camera flies to the next scene, over the same picture
  })
  expect(await onTop('still')).toBe(true)
  expect(await background(page, 'b')).toMatchObject({ shown: true, covers: true })
  await page.close()
}, 30_000)

test('mid-flight between two scenes with one background, one still picture covers the stage: no seam', async () => {
  const page = await open('#/b/first/2')
  const before = await backgrounds(page)
  expect(before).toHaveLength(1)
  const cam = await camera(page)
  const move = page.evaluate(() => window.klappe.stepper.next())
  for (const wait of [300, 500]) {
    await page.waitForTimeout(wait)
    const mid = await backgrounds(page)
    expect(mid).toHaveLength(1)
    expect(mid[0]).toMatchObject({ id: 'b', covers: true, opacity: 1, transform: before[0].transform })
    expect(await camera(page)).not.toBe(cam) // the camera is on its way
  }
  await move
  expect(await camera(page)).not.toBe(cam)
  await page.close()
}, 30_000)

test('a cold deep link into section B shows the scene background pushed in, and it replaces the section one', async () => {
  const page = await open('#/b/second/1')
  const second = await background(page, 'second')
  expect(second).toMatchObject({ shown: true, covers: true })
  expect(second.scale).toBeCloseTo(1.08, 3)
  expect((await backgrounds(page)).map((b) => b.id)).toEqual(['second'])
  // Data URLs hold no file name: the section's picture is the busy one with the dot layer, the scene's is not.
  const dots = encodeURIComponent('fill="url(#d)"')
  const section = await background(page, 'b')
  expect(section).toMatchObject({ shown: false })
  expect(section.src).toContain(dots)
  expect(second.src).not.toContain(dots)
  await page.close()
}, 30_000)

test('a missing background with alt text shows IMAGE MISSING and a prompt', async () => {
  const page = await open('#/b/no-sky/1')
  const r = await background(page, 'no-sky')
  expect(r.covers).toBe(true)
  expect(r.text).toContain('IMAGE MISSING')
  expect(r.text).toContain('A harbour at night, 16:9, 1920x1080, no text, no logos')
  expect(await page.evaluate(() => window.klappe.problems)).toContain(MISSING_BG)
  await page.close()
}, 30_000)
