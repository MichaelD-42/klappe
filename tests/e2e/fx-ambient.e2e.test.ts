import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
beforeAll(async () => void (browser = await chromium.launch()))
afterAll(() => browser?.close())

const MISSING = 'sections/30-c/20-no-loop/scene.md: background: VIDEO MISSING: media/harbour.mp4 — Waves in a harbour at night'
const EMPTY = 'sections/30-c/30-empty/scene.md: background: needs an href or animate'
const BAD_SVG = 'sections/40-d/30-bad-svg/scene.md: background: media/bad.svg animates but is not valid SVG; shown as a still picture'

// play() and pause() are stubbed: the stand-in video does not decode, and a test reads `playing` instead.
async function open(hash: string, flags = ''): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.addInitScript(() => {
    const P = HTMLMediaElement.prototype
    P.play = function () {
      this.dataset.testPlaying = '1'
      return Promise.resolve()
    }
    P.pause = function () {
      delete this.dataset.testPlaying
    }
  })
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-ambient${flags}${hash}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

// What each background is doing: the video plays or not, the aurora's animations run or are paused.
const state = (page: Page) =>
  page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>('[data-k-background="a"] video')
    const a = (id: string) => {
      const blobs = [...document.querySelectorAll<HTMLElement>(`[data-k-background="${id}"] [data-k-aurora] *`)]
      return blobs.length ? blobs.every((b) => getComputedStyle(b).animationPlayState === 'running') : null
    }
    return { video: v ? v.dataset.testPlaying === '1' : null, ownAurora: a('own-aurora'), aurora: a('b') }
  })
const go = (page: Page, hash: string) =>
  page.evaluate(async (h) => {
    const k = window.klappe
    const i = k.steps.findIndex((s: any) => `#/${s.section.replace(/^\d+-/, '')}/${s.scene.replace(/^\d+-/, '')}/${s.step}` === h)
    await k.stepper.goto(i, 'play')
    await new Promise((r) => setTimeout(r, 1700)) // past the stop of the background left behind, a camera flight after the move
  }, hash)

test.each([
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
])('walk: the ambient fixture walks clean at $w x $h, but for the missing video, the empty background and the bad SVG', async (vp) => {
  const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-ambient`, vp)
  expect(r.errors).toEqual([])
  expect(r.checks.filter((c) => !c.ok)).toEqual([])
  expect(r.problems).toEqual([MISSING, EMPTY, BAD_SVG])
}, 120_000)

test('a video background is muted, loops, covers the stage and sits outside the timeline', async () => {
  const page = await open('#/a/loop/1')
  const v = await page.evaluate(() => {
    const v = document.querySelector<HTMLVideoElement>('[data-k-background="a"] video')!
    return { muted: v.muted, loop: v.loop, inline: v.playsInline, fit: getComputedStyle(v).objectFit, ignored: !!v.closest('[data-k-ignore]'), covers: v.getBoundingClientRect().width === document.querySelector('.k-stage')!.getBoundingClientRect().width }
  })
  expect(v).toEqual({ muted: true, loop: true, inline: true, fit: 'cover', ignored: true, covers: true })
  await page.close()
})

test('only the background on screen moves; the one left behind stops once the camera has landed', async () => {
  const page = await open('#/a/loop/1')
  expect(await state(page)).toEqual({ video: true, ownAurora: false, aurora: false })
  await go(page, '#/a/same-loop/1')
  expect(await state(page)).toEqual({ video: true, ownAurora: false, aurora: false })
  await go(page, '#/a/own-aurora/1')
  expect(await state(page)).toEqual({ video: false, ownAurora: true, aurora: false })
  await go(page, '#/b/aurora/1')
  expect(await state(page)).toEqual({ video: false, ownAurora: false, aurora: true })
  await go(page, '#/c/plain/1')
  expect(await state(page)).toEqual({ video: false, ownAurora: false, aurora: false })
  await page.close()
}, 60_000)

test('a deep link starts the background of the scene it lands on', async () => {
  const page = await open('#/b/aurora/2')
  expect(await state(page)).toEqual({ video: false, ownAurora: false, aurora: true })
  await page.close()
})

for (const flags of ['&reducedmotion=1', '&selftest=still'])
  test(`backgrounds stay still with ${flags}`, async () => {
    const page = await open('#/a/loop/1', flags)
    expect(await state(page)).toEqual({ video: false, ownAurora: false, aurora: false })
    await go(page, '#/a/own-aurora/1')
    expect(await state(page)).toEqual({ video: false, ownAurora: false, aurora: false })
    await page.close()
  }, 60_000)

test('a missing video background shows VIDEO MISSING with its alt text and records a problem', async () => {
  const page = await open('#/c/no-loop/1')
  const text = await page.evaluate(() => document.querySelector<HTMLElement>('[data-k-background="no-loop"]')!.innerText)
  expect(text).toContain('VIDEO MISSING')
  expect(text).toContain('Waves in a harbour at night')
  expect(await page.evaluate(() => window.klappe.problems)).toContain(MISSING)
  await page.close()
})

// The aurora is a background for text: the brightest pixel behind the text keeps 4.5:1, in both themes.
const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
for (const theme of ['calm', 'bold'])
  test(`text over the aurora keeps 4.5:1 against the brightest pixel behind it (${theme})`, async () => {
    const page = await open('#/b/aurora/2', `&theme=${theme}&reducedmotion=0`)
    const sel = '[data-scene="aurora"] h2, [data-scene="aurora"] p'
    await page.waitForTimeout(1500)
    const boxes = await page.$$eval(sel, (es) =>
      es.map((e) => {
        const r = e.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: r.height, color: getComputedStyle(e).color }
      }),
    )
    const shown = boxes.filter((b) => b.width > 0 && b.height > 0)
    expect(shown.length).toBeGreaterThanOrEqual(2)
    await page.addStyleTag({ content: `${sel} { color: transparent !important }` })
    for (const b of shown) {
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
          // The worst pixel for the text: the brightest on a dark theme, the darkest on a light one.
          const [r, g, bl] = color.match(/\d+/g)!.map(Number)
          const text = lum(r, g, bl)
          let worst = text > 0.5 ? 0 : 1
          for (let i = 0; i < d.length; i += 4) {
            const l = lum(d[i], d[i + 1], d[i + 2])
            worst = text > 0.5 ? Math.max(worst, l) : Math.min(worst, l)
          }
          return [worst, text]
        },
        [png, b.color] as const,
      )
      expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5)
    }
    await page.close()
  }, 30_000)

// Section D: what the deck's own background and the animated SVG file are doing.
const dState = (page: Page) =>
  page.evaluate(() => {
    const own = document.querySelector<HTMLElement>('[data-k-background="own"] [data-own]')!.getAnimations()[0].playState
    const host = document.querySelector<HTMLElement>('[data-k-background="svg-loop"] [data-k-svg-loop]')!
    const svg = host.shadowRoot!.querySelector('svg')!
    return { own: own === 'running', svg: !svg.animationsPaused() }
  })

test('a background the deck draws and an animated SVG file play only while on screen', async () => {
  const page = await open('#/d/own/1')
  expect(await dState(page)).toEqual({ own: true, svg: false })
  await go(page, '#/d/svg-loop/1')
  expect(await dState(page)).toEqual({ own: false, svg: true })
  await go(page, '#/c/plain/1')
  expect(await dState(page)).toEqual({ own: false, svg: false })
  await page.close()
}, 60_000)

test('the deck\'s own and SVG backgrounds stay still with reduced motion', async () => {
  const page = await open('#/d/own/1', '&reducedmotion=1')
  expect(await dState(page)).toEqual({ own: false, svg: false })
  await go(page, '#/d/svg-loop/1')
  expect(await dState(page)).toEqual({ own: false, svg: false })
  await page.close()
}, 60_000)

test('an animated SVG file keeps its animations and drops scripts, handlers, outside links and foreign content', async () => {
  const page = await open('#/d/svg-loop/1')
  const r = await page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('[data-k-background="svg-loop"] [data-k-svg-loop]')!.shadowRoot!
    const svg = root.querySelector('svg')!
    const css = [...root.querySelectorAll('style')].map((s) => s.textContent).join('')
    return {
      hacked: (window as any).hacked ?? null,
      script: !!root.querySelector('script'),
      onload: svg.hasAttribute('onload'),
      foreign: !!root.querySelector('foreignObject'),
      set: !!root.querySelector('set'),
      animate: !!root.querySelector('animate'),
      keyframes: css.includes('@keyframes spin'),
      outside: /evil\.test/.test(css),
      // Its styles stay in the shadow root: the page has no rule for .r.
      leaked: [...document.styleSheets].some((s) => [...s.cssRules].some((r) => r.cssText.startsWith('.r'))),
    }
  })
  expect(r).toEqual({ hacked: null, script: false, onload: false, foreign: false, set: false, animate: true, keyframes: true, outside: false, leaked: false })
  await page.close()
})

// The demo's rings.svg uses var(--k-line) in its own <style>: the theme token reaches into the shadow root.
test('an inlined SVG takes the theme tokens', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.goto(`${inject('BASE_URL')}/#/fullscreen/svg-loop/1`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await page.evaluate(() => {
    const ring = document.querySelector<HTMLElement>('[data-k-svg-loop]')!.shadowRoot!.querySelector('.ring:not(.lit)')!
    const line = getComputedStyle(document.documentElement).getPropertyValue('--k-line').trim()
    const probe = Object.assign(document.createElement('div'), { style: `color: ${line}` })
    document.body.append(probe)
    return { stroke: getComputedStyle(ring).stroke, line: getComputedStyle(probe).color }
  })
  expect(r.stroke).toBe(r.line)
  await page.close()
})
