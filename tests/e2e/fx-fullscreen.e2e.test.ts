import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => {
  browser = await chromium.launch()
})
afterAll(() => browser?.close())

const MISSING = 'IMAGE MISSING: media/sunrise.png — A sunrise over a mountain ridge'

async function open(hash: string, vp = { width: 1366, height: 768 }): Promise<Page> {
  const page = await browser.newPage({ viewport: vp })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-fullscreen${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`full-screen fixture walks clean at ${vp.w}x${vp.h}, but for the one missing cover`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-fullscreen`, vp)
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.problems).toEqual([MISSING]) // so r.ok is false by design
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

// WCAG contrast of two relative luminances.
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)

test('text over the scrim is at least 14 px at 1366 and keeps 4.5:1 against the brightest pixel behind it', async () => {
  const page = await open('#/a/scrim/1')
  const sel = '[data-scene$="scrim"] h2, [data-scene$="scrim"] p'
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
})

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

test('a section background stays behind the text through the canvas transition and the camera move', async () => {
  const page = await open('#/a/missing/1')
  // The text on top at its centre, and the background under it visible and covering the stage.
  const check = (scene: string) =>
    page.evaluate((scene) => {
      const h2 = document.querySelector<HTMLElement>(`[data-scene$="${scene}"] h2`)!
      const world = h2.closest<HTMLElement>('.k-world')!
      const scenes = [...world.querySelectorAll('.k-scene')]
      const bg = world.firstElementChild!.children[scenes.indexOf(h2.closest('.k-scene')!)] as HTMLElement
      const r = h2.getBoundingClientRect()
      const s = document.querySelector('.k-stage')!.getBoundingClientRect()
      const b = bg.getBoundingClientRect()
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
      return {
        onTop: !!top && h2.contains(top),
        bgShown: bg.querySelector('img')!.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        covers: b.left <= s.left + 1 && b.top <= s.top + 1 && b.right >= s.right - 1 && b.bottom >= s.bottom - 1,
        canvas: Number(world.style.opacity),
      }
    }, scene)
  const move = page.evaluate(() => window.klappe.stepper.next()) // fade into section B's canvas
  await page.waitForTimeout(250)
  const mid = await check('first')
  expect(mid.canvas).toBeGreaterThan(0)
  expect(mid.bgShown).toBe(true)
  await move
  expect(await check('first')).toMatchObject({ onTop: true, bgShown: true, covers: true, canvas: 1 })
  await page.evaluate(async () => {
    await window.klappe.stepper.next()
    await window.klappe.stepper.next() // the camera flies to the second scene
  })
  expect(await check('second')).toMatchObject({ onTop: true, bgShown: true, covers: true, canvas: 1 })
  await page.close()
}, 30_000)
