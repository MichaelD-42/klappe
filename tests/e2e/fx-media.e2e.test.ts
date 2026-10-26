import { chromium, type Page } from '@playwright/test'
import { afterAll, beforeAll, expect, inject, test } from 'vitest'
import { runSelftest } from './driver'

let browser: Awaited<ReturnType<typeof chromium.launch>>
let clip: Buffer
beforeAll(async () => {
  browser = await chromium.launch()
  // A 2 s webm drawn and recorded in the browser: the test needs a playable file and ffmpeg is not required.
  const p = await browser.newPage()
  const b64 = await p.evaluate(async () => {
    const c = document.createElement('canvas')
    c.width = c.height = 64
    const g = c.getContext('2d')!
    const rec = new MediaRecorder(c.captureStream(30), { mimeType: 'video/webm' })
    const parts: Blob[] = []
    rec.ondataavailable = (e) => parts.push(e.data)
    const done = new Promise((r) => (rec.onstop = r))
    rec.start()
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `hsl(${i * 6} 80% 50%)`
      g.fillRect(0, 0, 64, 64)
      await new Promise((r) => setTimeout(r, 33))
    }
    rec.stop()
    await done
    const buf = new Uint8Array(await new Blob(parts).arrayBuffer())
    let s = ''
    for (const x of buf) s += String.fromCharCode(x)
    return btoa(s)
  })
  clip = Buffer.from(b64, 'base64')
  await p.close()
}, 60_000)
afterAll(() => browser?.close())

async function open(url: string): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.route('https://klappe.test/**', (r) => r.fulfill({ body: clip, contentType: 'video/webm' }))
  await page.goto(`${inject('BASE_URL')}/${url}`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  return page
}

for (const vp of [
  { w: 1920, h: 1080 },
  { w: 1366, h: 768 },
  { w: 1024, h: 768 },
])
  test(`media fixture walks clean at ${vp.w}x${vp.h}`, async () => {
    const r = await runSelftest(`${inject('BASE_URL')}/?selftest=walk&fixture=fx-media`, vp)
    expect(r.problems).toEqual([])
    expect(r.errors).toEqual([])
    expect(r.checks.filter((c) => !c.ok)).toEqual([])
    expect(r.ok).toBe(true)
  }, 120_000)

test('a missing image shows IMAGE MISSING with its alt text and records a problem', async () => {
  const page = await open('?fixture=media-layout#/a/media/2')
  const text = await page.evaluate(() => document.querySelector('div[data-k-media="2"]')?.textContent)
  expect(text).toContain('IMAGE MISSING')
  expect(text).toContain('An engineer at a desk')
  const problems: string[] = await page.evaluate(() => window.klappe.problems)
  expect(problems.some((p) => p.includes('IMAGE MISSING'))).toBe(true)
  await page.close()
})

test('a video plays on its step, pauses on leave, and an online one carries a speaker note', async () => {
  const page = await open('?fixture=fx-media#/a/online-video/1')
  const state = () => page.evaluate(() => document.querySelector<HTMLVideoElement>('[data-scene$="online-video"] video')!.paused)
  expect(await state()).toBe(true)
  expect(await page.evaluate(() => document.querySelector('[data-scene$="online-video"] [data-k-note]')?.getAttribute('data-k-note'))).toContain('needs internet')
  expect(await page.evaluate(() => document.querySelector('[data-scene$="online-video"] video')!.hasAttribute('data-k-ignore'))).toBe(true)
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForFunction(() => !document.querySelector<HTMLVideoElement>('[data-scene$="online-video"] video')!.paused, undefined, { timeout: 10_000 })
  await page.evaluate(() => window.klappe.stepper.next())
  expect(await state()).toBe(true)
  // Back onto the video's step is a cut: it stays paused.
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.stepper.index - 1, 'cut'))
  await page.waitForTimeout(800)
  expect(await state()).toBe(true)
  await page.close()
})

test('a deep link to a video step does not play it', async () => {
  const page = await open('?fixture=fx-media#/a/online-video/2')
  await page.waitForTimeout(1500)
  expect(await page.evaluate(() => document.querySelector<HTMLVideoElement>('[data-scene$="online-video"] video')!.paused)).toBe(true)
  await page.close()
})

test('video boxes are 16:9 inside the slot, framed, with the title as a caption', async () => {
  const page = await open('?fixture=fx-media#/a/youtube/2')
  const r = await page.evaluate(() => {
    const b = document.querySelector<HTMLElement>('[data-scene$="youtube"] [data-k-video]')!.parentElement!
    const cap = b.lastElementChild as HTMLElement
    return {
      ratio: b.offsetWidth / b.offsetHeight,
      border: getComputedStyle(b).borderTopWidth,
      caption: cap.textContent,
      shown: cap.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
      ignored: !!cap.closest('[data-k-ignore]'),
    }
  })
  expect(r.ratio).toBeCloseTo(16 / 9, 2)
  expect(r.border).not.toBe('0px')
  expect(r).toMatchObject({ caption: 'A YouTube talk', shown: true, ignored: false })
  await page.close()
})

test('offline, a video shows its fallback image and caption; one without a fallback is a deck problem', async () => {
  const page = await open('?fixture=fx-media&offline=1#/a/youtube/2')
  const r = await page.evaluate(() => {
    const m = document.querySelector('[data-scene$="youtube"] div[data-k-media]')!
    const img = m.querySelector('img')
    return { img: img?.getAttribute('src'), shown: img?.checkVisibility({ opacityProperty: true, visibilityProperty: true }), iframe: !!m.querySelector('iframe'), text: m.textContent }
  })
  expect(r).toMatchObject({ shown: true, iframe: false, text: 'Video needs a network connection' })
  expect(r.img).toMatch(/^data:image/)
  const problems: string[] = await page.evaluate(() => window.klappe.problems)
  expect(problems.some((p) => p.includes('vimeo') && p.includes('Video needs a network connection'))).toBe(true)
  expect(problems.some((p) => p.includes('A YouTube talk'))).toBe(false) // it has a fallback
  await page.close()
})

test('a click into an embedded player leaves the arrow keys working', async () => {
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } })
  await page.route('https://www.youtube.com/**', (r) => r.fulfill({ body: '<body style="background:#333">player</body>', contentType: 'text/html' }))
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-media#/a/youtube/2`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  await page.click('[data-scene$="youtube"] iframe')
  // Focus comes back one tick after the blur; a key pressed before that still goes to the iframe.
  await page.waitForFunction(() => !(document.activeElement instanceof HTMLIFrameElement), undefined, { timeout: 5_000 })
  const before: number = await page.evaluate(() => window.klappe.stepper.index)
  await page.keyboard.press('ArrowRight')
  await page.waitForFunction((i) => window.klappe.stepper.index === i + 1, before, { timeout: 5_000 })
  await page.close()
})

// A YouTube or Vimeo address without a video id cannot play: say so, instead of a broken box.
test('a video host link without a video id is a deck problem with a placeholder', async () => {
  const page = await browser.newPage()
  await page.goto(`${inject('BASE_URL')}/?fixture=fx-media`)
  await page.waitForFunction(() => window.klappe?.stepper?.index >= 0, undefined, { timeout: 30_000 })
  const r = await page.evaluate(async () => {
    const { video } = await (new Function('p', 'return import(p)') as (p: string) => Promise<any>)('/src/fx/media.ts') // a string: vitest would rewrite import()
    const html = document.body.appendChild(document.createElement('div'))
    const problems: string[] = []
    const ctx = { html, rect: { x: 0, y: 0, w: 1920, h: 1080 }, files: { media: {}, data: {} }, deck: { lang: 'en', intensity: 'calm' }, problem: (p: string) => problems.push(p) }
    video(ctx as any, { href: 'https://www.youtube.com/@channel', title: 'Our channel', rect: { x: 0, y: 0, w: 800, h: 450 } })
    const out = { problems, frames: html.querySelectorAll('iframe, video').length, text: html.textContent }
    html.remove()
    return out
  })
  expect(r.problems).toEqual(['VIDEO MISSING: https://www.youtube.com/@channel has no video id; link one video — Our channel'])
  expect(r.frames).toBe(0)
  expect(r.text).toContain('VIDEO MISSING')
  await page.close()
})

// video() with no rect: the clip fills the scene frame, cropped to cover, with no frame or caption.
for (const [hash, scene] of [['#/a/full-video/1', 'full-video'], ['#/a/full-youtube/1', 'full-youtube']])
  test(`a full-frame video covers the stage with no frame or caption (${scene})`, async () => {
    const page = await open(`?fixture=fx-media${hash}`)
    const r = await page.evaluate((scene) => {
      const v = document.querySelector<HTMLElement>(`[data-scene="${scene}"] [data-k-video]`)!
      const b = v.parentElement!
      const box = b.getBoundingClientRect()
      const stage = document.querySelector('.k-stage')!.getBoundingClientRect()
      return {
        covers: Math.abs(box.width - stage.width) < 1 && Math.abs(box.height - stage.height) < 1,
        border: getComputedStyle(b).borderTopWidth,
        children: b.children.length,
        fit: getComputedStyle(v).objectFit,
        title: v.getAttribute('title'),
      }
    }, scene)
    expect(r).toMatchObject({ covers: true, border: '0px', children: 1 })
    expect(r.title).toMatch(/^A full-frame/)
    if (scene === 'full-video') expect(r.fit).toBe('cover')
    await page.close()
  })

test('a full-frame video plays on its step and pauses on leave', async () => {
  const page = await open('?fixture=fx-media#/a/vimeo/3')
  const paused = () => page.evaluate(() => document.querySelector<HTMLVideoElement>('[data-scene="full-video"] video')!.paused)
  await page.evaluate(() => window.klappe.stepper.next())
  await page.waitForFunction(() => !document.querySelector<HTMLVideoElement>('[data-scene="full-video"] video')!.paused, undefined, { timeout: 10_000 })
  await page.evaluate(() => window.klappe.stepper.next())
  expect(await paused()).toBe(true)
  await page.close()
})

// A bare ctx, as in fx-crt: el is the picture's box, for a found file and for the IMAGE MISSING stand-in.
test('the image handle exposes its box as el', async () => {
  const page = await open('?fixture=fx-media#/a/image/1')
  await page.evaluate("import('/src/fx/media.ts').then((m) => { window.__image = m.image })")
  const r = await page.evaluate(() => {
    const html = document.body.appendChild(document.createElement('div'))
    const ctx = { html, rect: { x: 0, y: 0, w: 1920, h: 1080 }, files: { data: {}, media: { 'media/a.png': 'data:image/png;base64,' } }, deck: { lang: 'en', intensity: 'calm' }, problem: () => {} }
    const found = (window as any).__image(ctx, { href: 'media/a.png', alt: 'A' })
    const isFound = found.el === html.lastElementChild && !!found.el.querySelector('img')
    const gone = (window as any).__image(ctx, { href: 'media/none.png', alt: 'B' })
    const isGone = gone.el === html.lastElementChild && gone.el.textContent.includes('IMAGE MISSING')
    html.remove()
    return { isFound, isGone }
  })
  expect(r).toEqual({ isFound: true, isGone: true })
  await page.close()
})

// An embed loads one step before its scene, so the player is ready when the scene shows; a deep link elsewhere makes no iframe.
test('YouTube and Vimeo iframes are created one step before their scene', async () => {
  const page = await open('?fixture=fx-media#/a/image/1')
  for (const host of ['https://www.youtube.com/**', 'https://player.vimeo.com/**']) await page.route(host, (r) => r.fulfill({ body: '<body>player</body>', contentType: 'text/html' }))
  const frames = () => page.evaluate(() => [...document.querySelectorAll('iframe[data-k-video]')].map((f) => f.closest('[data-scene]')!.getAttribute('data-scene')!.split('/').pop()))
  expect(await frames()).toEqual([])
  // Before its scene, the YouTube box holds its fallback still as a poster, outside the self-test's snapshot;
  // the player replaces it.
  expect(await page.evaluate(() => document.querySelector('[data-scene$="youtube"] [data-k-media] img')?.hasAttribute('data-k-ignore'))).toBe(true)
  const go = (name: string) =>
    page.evaluate((n) => {
      const s = window.klappe.stepper as any
      return s.goto(s.steps.findIndex((x: { scene: string }) => x.scene.endsWith(n)), 'cut')
    }, name)
  // One step early: on the last step of the scene before, the next scene's player starts to load.
  await page.evaluate(() => {
    const s = window.klappe.stepper as any
    const i = s.steps.findIndex((x: { scene: string }) => x.scene.endsWith('youtube')) - 1
    return s.goto(i, 'cut')
  })
  expect(await frames()).toEqual(['youtube'])
  await go('youtube')
  expect(await frames()).toEqual(['youtube'])
  expect(await page.evaluate(() => !!document.querySelector('[data-scene$="youtube"] [data-k-media] img'))).toBe(false)
  expect(await page.evaluate(() => document.querySelector('[data-scene$="youtube"] iframe')!.hasAttribute('data-k-ignore'))).toBe(true)
  await go('vimeo')
  expect(await frames()).toEqual(['youtube', 'vimeo'])
  await page.close()
})

// autoplay: the player loads its plain address one step early, its autoplay address on its step, the plain one after.
test('an autoplay embed starts on its step, muted by default, and stops on leave', async () => {
  const page = await open('?fixture=fx-media#/a/full-youtube/2')
  for (const host of ['https://www.youtube.com/**', 'https://player.vimeo.com/**']) await page.route(host, (r) => r.fulfill({ body: '<body>player</body>', contentType: 'text/html' }))
  const frame = (s: string) =>
    page.evaluate((n) => {
      const f = document.querySelector<HTMLIFrameElement>(`[data-scene$="${n}"] iframe`)
      return f && { src: f.getAttribute('src'), allow: f.allow }
    }, s)
  const step = () => page.evaluate(() => window.klappe.stepper.next())
  const until = (s: string, src: string) =>
    page.waitForFunction(([n, v]) => document.querySelector(`[data-scene$="${n}"] iframe`)?.getAttribute('src') === v, [s, src], { timeout: 10_000 })
  const yt = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
  const vm = 'https://player.vimeo.com/video/76979871'
  // Without autoplay the viewer starts the player, and the iframe gets no autoplay permission.
  expect((await frame('full-youtube'))!.allow).not.toContain('autoplay')
  expect(await frame('autoplay-muted')).toEqual({ src: yt, allow: 'autoplay; fullscreen; picture-in-picture' })
  await step()
  await until('autoplay-muted', `${yt}?autoplay=1&mute=1`)
  await step()
  await until('autoplay-muted', yt)
  await step()
  await until('autoplay-sound', `${vm}?autoplay=1&muted=0`)
  // Back onto the muted player's step is a cut: both stay stopped, like a local file.
  await page.evaluate(() => window.klappe.stepper.goto(window.klappe.stepper.index - 2, 'cut'))
  await page.waitForTimeout(800)
  expect((await frame('autoplay-muted'))!.src).toBe(yt)
  expect((await frame('autoplay-sound'))!.src).toBe(vm)
  await page.close()
})
